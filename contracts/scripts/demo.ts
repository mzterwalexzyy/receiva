import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (![31337, 421614].includes(chainId)) throw new Error("Demo only supports local and Arbitrum Sepolia.");
  const local = chainId === 31337;
  const deployment = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../evidence/deployment-${chainId}.json`), "utf8"));
  const output = path.resolve(__dirname, `../../evidence/demo-${chainId}.json`);
  const previous = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, "utf8")) : undefined;
  if (previous?.completed) throw new Error("The recorded demo is already complete.");
  if (previous && previous.hub !== deployment.hub) throw new Error("Existing demo belongs to another deployment. Preserve its evidence before starting again.");
  const signers = await ethers.getSigners();
  const supplier = signers[0];
  if (!local && (!process.env.BUYER_PRIVATE_KEY || !process.env.FUNDER_PRIVATE_KEY)) throw new Error("Configure buyer and funder keys locally.");
  const buyer = local ? signers[1] : new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!, ethers.provider);
  const funder = local ? signers[2] : new ethers.Wallet(process.env.FUNDER_PRIVATE_KEY!, ethers.provider);
  const hub: any = await ethers.getContractAt("ReceivableHub", deployment.hub);
  const token: any = await ethers.getContractAt("IERC20", deployment.token);
  const unit = 10n ** BigInt(deployment.decimals);
  // Small test-token amounts keep the demo compatible with faucet limits.
  const face = 10n * unit, advance = 98n * unit / 10n, bond = unit;
  const buyerBalance = await token.balanceOf(buyer.address), funderBalance = await token.balanceOf(funder.address);
  if (buyerBalance < 20n * unit || funderBalance < 20n * unit) throw new Error(`Need 20 ${deployment.symbol} each in buyer ${buyer.address} and funder ${funder.address}. Current balances: ${ethers.formatUnits(buyerBalance, deployment.decimals)}, ${ethers.formatUnits(funderBalance, deployment.decimals)}.`);
  const record: any = previous || { chainId, network: network.name, hub: deployment.hub, token: deployment.token, supplier: supplier.address, buyer: buyer.address, funder: funder.address, testData: true, completed: false, transactions: [], simulations: [] };
  const save = () => fs.writeFileSync(output, JSON.stringify(record, null, 2));
  async function tx(label: string, promise: Promise<any>) { const sent = await promise; record.transactions.push({ label, hash: sent.hash, status: "pending" }); save(); const receipt = await sent.wait(); Object.assign(record.transactions.at(-1), { blockNumber: receipt.blockNumber, status: receipt.status === 1 ? "success" : "reverted" }); save(); console.log(`${label}: ${sent.hash}`); return receipt; }
  if (!local) for (const actor of [buyer, funder]) {
    const balance = await ethers.provider.getBalance(actor.address);
    if (balance < ethers.parseEther("0.001")) await tx(`Fund ${actor.address} test gas`, supplier.sendTransaction({ to: actor.address, value: ethers.parseEther("0.002") - balance }));
  }
  await tx("Buyer token allowance", token.connect(buyer).approve(deployment.hub, face * 2n + bond * 2n));
  await tx("Funder token allowance", token.connect(funder).approve(deployment.hub, advance * 2n));
  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const first = record.onTimeInvoice !== undefined ? BigInt(record.onTimeInvoice) : await hub.nextReceivableId(); record.onTimeInvoice = String(first); save();
  if ((await hub.nextReceivableId()) <= first) await tx("Create on-time invoice", hub.connect(supplier).createReceivable(ethers.sha256(ethers.toUtf8Bytes(`Receiva demo on-time ${chainId} ${now}`)), buyer.address, face, advance, bond, now + 3600, now + 1800));
  if ((await hub.receivables(first)).status === 0n) await tx("Buyer approves on-time invoice", hub.connect(buyer).approveReceivable(first));
  if ((await hub.receivables(first)).status === 1n) {
    const before = await token.balanceOf(supplier.address);
    await tx("Funder finances on-time invoice", hub.connect(funder).fundReceivable(first));
    if ((await token.balanceOf(supplier.address)) - before !== advance) throw new Error("Supplier balance increase is incorrect.");
  }
  for (const [label, actor, method] of [["Second funding rejected", funder, "fundReceivable"], ["Post-funding cancellation rejected", supplier, "cancelDraft"]] as const) {
    try { await hub.connect(actor)[method].staticCall(first); throw new Error("Expected contract rejection did not happen."); }
    catch (e: any) { const data = typeof e.data === "string" ? e.data : e.data?.data; if (!data) throw e; const decoded = hub.interface.parseError(data); record.simulations.push({ label, method: "eth_call", error: decoded?.name, invoiceId: String(first) }); save(); }
  }
  if ((await hub.receivables(first)).status === 2n) await tx("Buyer settles on-time invoice", hub.connect(buyer).settleReceivable(first));
  const second = record.defaultInvoice !== undefined ? BigInt(record.defaultInvoice) : await hub.nextReceivableId(); record.defaultInvoice = String(second); save();
  const secondNow = (await ethers.provider.getBlock("latest"))!.timestamp;
  const secondExists = (await hub.nextReceivableId()) > second;
  const due = secondExists ? Number((await hub.receivables(second)).dueDate) : secondNow + (local ? 300 : 180);
  if (!secondExists) await tx("Create accelerated default invoice", hub.connect(supplier).createReceivable(ethers.sha256(ethers.toUtf8Bytes(`Receiva demo default ${chainId} ${secondNow}`)), buyer.address, face, advance, bond, due, due - 30));
  if ((await hub.receivables(second)).status === 0n) await tx("Buyer approves default invoice", hub.connect(buyer).approveReceivable(second));
  if ((await hub.receivables(second)).status === 1n) await tx("Funder finances default invoice", hub.connect(funder).fundReceivable(second));
  if (local && (await ethers.provider.getBlock("latest"))!.timestamp <= due) { await ethers.provider.send("evm_setNextBlockTimestamp", [due + 1]); await ethers.provider.send("evm_mine", []); }
  else {
    console.log(`Waiting for due date ${new Date(due * 1000).toISOString()}`);
    while ((await ethers.provider.getBlock("latest"))!.timestamp <= due) await new Promise(resolve => setTimeout(resolve, 10000));
  }
  if ((await hub.receivables(second)).status === 2n) await tx("Declare default and release bond", hub.markDefault(second));
  record.defaultOutstanding = String((await hub.receivables(second)).outstandingAmount); save();
  if ((await hub.receivables(second)).status === 4n) await tx("Buyer cures remaining debt", hub.connect(buyer).cureDefault(second));
  record.completed = true; record.completedAt = new Date().toISOString(); save();
  console.log(`Demo complete. Evidence: ${output}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
