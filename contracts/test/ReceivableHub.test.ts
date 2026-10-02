import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("ReceivableHub", function () {
  async function fixture() {
    const [supplier, buyer, funder, stranger] = await ethers.getSigners();
    const token: any = await ethers.deployContract("MockUSDG");
    const hub: any = await ethers.deployContract("ReceivableHub", [await token.getAddress()]);
    for (const actor of [buyer, funder, stranger]) {
      await token.mint(actor.address, 1000000n);
      await token.connect(actor).approve(await hub.getAddress(), ethers.MaxUint256);
    }
    const now = await time.latest();
    const hash = ethers.sha256(ethers.toUtf8Bytes("invoice-one"));
    const args = [hash, buyer.address, 1000n, 980n, 100n, now + 1000, now + 500] as const;
    const create = () => hub.connect(supplier).createReceivable(...args);
    const approve = async () => { await create(); await hub.connect(buyer).approveReceivable(0); };
    const fund = async () => { await approve(); await hub.connect(funder).fundReceivable(0); };
    return { supplier, buyer, funder, stranger, token, hub, now, hash, args, create, approve, fund };
  }

  it("registers terms and reserves the invoice hash", async () => {
    const { hub, hash, buyer, supplier, create } = await loadFixture(fixture);
    await expect(create()).to.emit(hub, "ReceivableCreated").withArgs(0, hash, supplier.address, buyer.address, 1000, 980);
    const r = await hub.receivables(0);
    expect(r.supplier).eq(supplier.address); expect(r.status).eq(0); expect(await hub.nextReceivableId()).eq(1);
    expect(await hub.registeredInvoiceHashes(await hub.registrationKey(hash, supplier.address))).eq(true);
  });
  it("pays the supplier once and settles the funder with the bond returned", async () => {
    const { hub, token, supplier, buyer, funder, fund } = await loadFixture(fixture);
    await fund();
    expect(await token.balanceOf(supplier.address)).eq(980);
    expect(await token.balanceOf(await hub.getAddress())).eq(100);
    expect((await hub.receivables(0)).funder).eq(funder.address);
    await expect(hub.connect(buyer).settleReceivable(0)).to.changeTokenBalances(token, [buyer, funder, hub], [-900, 1000, -100]);
    expect((await hub.receivables(0)).status).eq(3);
    expect((await hub.receivables(0)).outstandingAmount).eq(0);
    expect(await hub.successfulRepayments(buyer.address)).eq(1);
  });
  it("pays the bond on default and only the remainder on cure", async () => {
    const { hub, token, buyer, funder, stranger, now, fund } = await loadFixture(fixture);
    await fund(); await time.increaseTo(now + 1001);
    await expect(hub.connect(stranger).markDefault(0)).to.changeTokenBalances(token, [hub, funder], [-100, 100]);
    expect((await hub.receivables(0)).outstandingAmount).eq(900);
    expect(await hub.defaults(buyer.address)).eq(1);
    await expect(hub.connect(buyer).cureDefault(0)).to.changeTokenBalances(token, [buyer, funder], [-900, 900]);
    expect((await hub.receivables(0)).status).eq(5);
    expect(await hub.lateRepayments(buyer.address)).eq(1);
  });
  it("counts late direct settlement as a default and late repayment", async () => {
    const { hub, token, buyer, funder, now, fund } = await loadFixture(fixture);
    await fund(); await time.increaseTo(now + 1001);
    await expect(hub.connect(buyer).settleReceivable(0)).to.changeTokenBalances(token, [buyer, funder, hub], [-900, 1000, -100]);
    expect(await hub.successfulRepayments(buyer.address)).eq(0);
    expect(await hub.defaults(buyer.address)).eq(1); expect(await hub.lateRepayments(buyer.address)).eq(1);
    expect((await hub.receivables(0)).status).eq(5);
  });
  it("returns the bond when an approval expires", async () => {
    const { hub, token, buyer, now, approve } = await loadFixture(fixture);
    await approve(); await time.increaseTo(now + 500);
    await expect(hub.expireReceivable(0)).to.changeTokenBalances(token, [hub, buyer], [-100, 100]);
    expect((await hub.receivables(0)).status).eq(7);
  });
  it("lets the supplier cancel a draft but keeps its hash reserved", async () => {
    const { hub, create, hash, supplier } = await loadFixture(fixture);
    await create(); await hub.cancelDraft(0);
    expect((await hub.receivables(0)).status).eq(6); expect(await hub.registeredInvoiceHashes(await hub.registrationKey(hash, supplier.address))).eq(true);
  });
  it("does not let another supplier squat on a supplier's invoice hash", async () => {
    const { hub, hash, args, supplier, stranger } = await loadFixture(fixture);
    await hub.connect(stranger).createReceivable(hash, args[1], args[2], args[3], args[4], args[5], args[6]);
    await hub.connect(supplier).createReceivable(hash, args[1], args[2], args[3], args[4], args[5], args[6]);
    expect(await hub.nextReceivableId()).eq(2);
  });
  const invalid = [
    ["zero buyer", 1, ethers.ZeroAddress, "InvalidParticipant"],
    ["zero hash", 0, ethers.ZeroHash, "InvalidInvoiceHash"],
    ["zero face value", 2, 0n, "InvalidAmount"],
    ["zero advance", 3, 0n, "InvalidAmount"],
    ["advance equal to face", 3, 1000n, "InvalidAmount"],
    ["advance above face", 3, 1001n, "InvalidAmount"],
    ["zero bond", 4, 0n, "InvalidAmount"],
    ["full bond", 4, 1000n, "InvalidAmount"],
    ["bond above face", 4, 1001n, "InvalidAmount"],
    ["past funding deadline", 6, 1, "InvalidDates"],
    ["past due date", 5, 1, "InvalidDates"]
  ] as const;
  for (const [name, index, value, error] of invalid) it(`rejects ${name}`, async () => {
    const { hub, args } = await loadFixture(fixture); const modified: any[] = [...args]; modified[index] = value;
    await expect(hub.createReceivable(...modified)).revertedWithCustomError(hub, error);
  });
  it("rejects identical supplier and buyer", async () => {
    const { hub, args, supplier } = await loadFixture(fixture); const a: any[] = [...args]; a[1] = supplier.address;
    await expect(hub.createReceivable(...a)).revertedWithCustomError(hub, "InvalidParticipant");
  });
  it("rejects a due date at the funding deadline", async () => {
    const { hub, args } = await loadFixture(fixture); const a: any[] = [...args]; a[5] = a[6];
    await expect(hub.createReceivable(...a)).revertedWithCustomError(hub, "InvalidDates");
  });
  it("rejects duplicate invoices", async () => {
    const { hub, create } = await loadFixture(fixture); await create();
    await expect(create()).revertedWithCustomError(hub, "DuplicateInvoice");
  });
  it("rejects operations on an unknown invoice", async () => {
    const { hub } = await loadFixture(fixture); await expect(hub.markDefault(99)).revertedWithCustomError(hub, "UnknownReceivable");
  });
  for (const action of ["approveReceivable", "cancelDraft"]) it(`rejects unauthorized ${action}`, async () => {
    const { hub, stranger, create } = await loadFixture(fixture); await create();
    await expect(hub.connect(stranger)[action](0)).revertedWithCustomError(hub, "Unauthorized");
  });
  it("rejects a second funding without paying the supplier again", async () => {
    const { hub, token, supplier, stranger, fund } = await loadFixture(fixture); await fund();
    await expect(hub.connect(stranger).fundReceivable(0)).revertedWithCustomError(hub, "ReceivableAlreadyFunded");
    expect(await token.balanceOf(supplier.address)).eq(980);
  });
  it("rejects cancellation after funding", async () => {
    const { hub, fund } = await loadFixture(fixture); await fund();
    await expect(hub.cancelDraft(0)).revertedWithCustomError(hub, "PostFundingCancellationForbidden");
  });
  it("rejects default before the due date", async () => {
    const { hub, fund } = await loadFixture(fixture); await fund();
    await expect(hub.markDefault(0)).revertedWithCustomError(hub, "DueDateNotReached");
  });
  it("rejects early expiry", async () => {
    const { hub, approve } = await loadFixture(fixture); await approve();
    await expect(hub.expireReceivable(0)).revertedWithCustomError(hub, "FundingWindowOpen");
  });
  for (const action of ["settleReceivable", "cureDefault"]) it(`rejects unauthorized ${action}`, async () => {
    const { hub, stranger, fund, now } = await loadFixture(fixture); await fund();
    if (action === "cureDefault") { await time.increaseTo(now + 1001); await hub.markDefault(0); }
    await expect(hub.connect(stranger)[action](0)).revertedWithCustomError(hub, "Unauthorized");
  });
  it("rejects repeat settlement", async () => {
    const { hub, buyer, fund } = await loadFixture(fixture); await fund(); await hub.connect(buyer).settleReceivable(0);
    await expect(hub.connect(buyer).settleReceivable(0)).revertedWithCustomError(hub, "InvalidStatus");
  });
  it("rejects repeat default and repeat cure", async () => {
    const { hub, buyer, fund, now } = await loadFixture(fixture); await fund(); await time.increaseTo(now + 1001); await hub.markDefault(0);
    await expect(hub.markDefault(0)).revertedWithCustomError(hub, "InvalidStatus");
    await hub.connect(buyer).cureDefault(0); await expect(hub.connect(buyer).cureDefault(0)).revertedWithCustomError(hub, "InvalidStatus");
  });
  for (const role of ["supplier", "buyer"]) it(`rejects the ${role} as funder`, async () => {
    const f = await loadFixture(fixture); await f.approve();
    await expect(f.hub.connect(f[role as "supplier" | "buyer"]).fundReceivable(0)).revertedWithCustomError(f.hub, "InvalidParticipant");
  });
  it("rejects funding exactly at the deadline", async () => {
    const { hub, funder, approve, now } = await loadFixture(fixture); await approve(); await time.setNextBlockTimestamp(now + 500);
    await expect(hub.connect(funder).fundReceivable(0)).revertedWithCustomError(hub, "FundingWindowClosed");
  });
  it("rejects approval after the deadline", async () => {
    const { hub, buyer, create, now } = await loadFixture(fixture); await create(); await time.increaseTo(now + 500);
    await expect(hub.connect(buyer).approveReceivable(0)).revertedWithCustomError(hub, "FundingWindowClosed");
  });
  it("allows settlement exactly at the due date", async () => {
    const { hub, buyer, fund, now } = await loadFixture(fixture); await fund(); await time.setNextBlockTimestamp(now + 1000);
    await hub.connect(buyer).settleReceivable(0); expect(await hub.successfulRepayments(buyer.address)).eq(1);
  });
  it("rolls approval back when the buyer has not approved token spending", async () => {
    const { hub, token, buyer, create } = await loadFixture(fixture); await create(); await token.connect(buyer).approve(await hub.getAddress(), 0);
    await expect(hub.connect(buyer).approveReceivable(0)).reverted; expect((await hub.receivables(0)).status).eq(0);
    expect(await token.balanceOf(await hub.getAddress())).eq(0);
  });
  it("keeps other invoice bonds intact through settlement and default", async () => {
    const { hub, token, buyer, funder, args, fund, now } = await loadFixture(fixture); await fund();
    await hub.createReceivable(ethers.id("second"), ...args.slice(1)); await hub.connect(buyer).approveReceivable(1); await hub.connect(funder).fundReceivable(1);
    await hub.connect(buyer).settleReceivable(0); expect(await token.balanceOf(await hub.getAddress())).eq(100);
    await time.increaseTo(now + 1001); await hub.markDefault(1); expect(await token.balanceOf(await hub.getAddress())).eq(0);
  });
});
