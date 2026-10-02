import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ReceivableHub randomized accounting", function () {
  it("conserves balances and bonds across 24 varied invoice lifecycles", async function () {
    this.timeout(120000);
    const [supplier, buyer, funder] = await ethers.getSigners();
    const token: any = await ethers.deployContract("MockUSDG"); const hub: any = await ethers.deployContract("ReceivableHub", [await token.getAddress()]);
    await token.mint(buyer.address, 100000000n); await token.mint(funder.address, 100000000n);
    for (const actor of [buyer, funder]) await token.connect(actor).approve(await hub.getAddress(), ethers.MaxUint256);
    let seed = 73421n; const random = () => { seed = (seed * 48271n) % 2147483647n; return seed; };
    let supplierExpected = 0n, buyerExpected = 100000000n, funderExpected = 100000000n, active = 0n;
    const invoices: { face: bigint; advance: bigint; bond: bigint; path: number }[] = [];
    const now = await time.latest();
    for (let i = 0; i < 24; i++) {
      const face = 1000n + random() % 100000n, advance = face - 1n - random() % (face - 1n), bond = 1n + random() % (face - 1n), path = i % 4;
      invoices.push({ face, advance, bond, path });
      await hub.createReceivable(ethers.id(`random-${i}`), buyer.address, face, advance, bond, now + 10000, now + 5000);
      await hub.connect(buyer).approveReceivable(i); active += bond; buyerExpected -= bond;
      if (path !== 3) { await hub.connect(funder).fundReceivable(i); supplierExpected += advance; funderExpected -= advance; }
      expect(await token.balanceOf(await hub.getAddress())).eq(active); expect(await hub.totalActiveBonds()).eq(active);
    }
    for (let i = 0; i < 24; i += 4) {
      const { face, bond } = invoices[i]; await hub.connect(buyer).settleReceivable(i); active -= bond; buyerExpected += bond - face; funderExpected += face;
      expect(await token.balanceOf(await hub.getAddress())).eq(active);
    }
    await time.increaseTo(now + 10001);
    for (let i = 0; i < 24; i++) {
      const { face, bond, path } = invoices[i];
      if (path === 1) { await hub.markDefault(i); active -= bond; funderExpected += bond; await hub.connect(buyer).cureDefault(i); buyerExpected -= face - bond; funderExpected += face - bond; }
      if (path === 2) { await hub.connect(buyer).settleReceivable(i); active -= bond; buyerExpected -= face - bond; funderExpected += face; }
      if (path === 3) { await hub.expireReceivable(i); active -= bond; buyerExpected += bond; }
      const r = await hub.receivables(i);
      expect(r.status).eq(path === 0 ? 3 : path === 3 ? 7 : 5);
      if (path !== 3) expect(r.funder).eq(funder.address);
      expect(r.outstandingAmount).eq(0);
      await expect(hub.connect(funder).fundReceivable(i)).reverted;
      expect(await hub.totalActiveBonds()).eq(active); expect(await token.balanceOf(await hub.getAddress())).eq(active);
    }
    expect(await token.balanceOf(supplier.address)).eq(supplierExpected);
    expect(await token.balanceOf(buyer.address)).eq(buyerExpected);
    expect(await token.balanceOf(funder.address)).eq(funderExpected);
    expect(supplierExpected + buyerExpected + funderExpected).eq(200000000n);
    expect(await hub.successfulRepayments(buyer.address)).eq(6); expect(await hub.lateRepayments(buyer.address)).eq(12); expect(await hub.defaults(buyer.address)).eq(12);
  });
});
