"use client";
import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { type Abi, type Address } from "viem";
import { hubAbi } from "@/lib/abi";
import { hubAddress, short } from "@/lib/chain";
import { fromTuple, errorText } from "@/lib/hooks";
import { ConnectionNotice } from "@/components/receivable-card";
const cases = [
  ["duplicate", "Register the same invoice", "Use an existing invoice. The identical hash should be rejected."],
  ["fund", "Fund an invoice twice", "Use a funded or settled invoice. The original funder cannot be replaced."],
  ["cancel", "Cancel after funding", "Use a funded invoice. The supplier can no longer cancel it."],
  ["default", "Declare default too early", "Use a funded invoice whose due date is still in the future."],
  ["settle", "Settle an invoice twice", "Use an invoice already settled on time."],
  ["approve", "Approve as the wrong wallet", "Use a draft. The supplier cannot approve on the buyer’s behalf."]
];
export default function Lab() {
  const client = usePublicClient(); const { address } = useAccount(); const [id, setId] = useState("0"); const [busy, setBusy] = useState(false); const [result, setResult] = useState("");
  async function run(kind: string) {
    if (!client || !hubAddress) return; setBusy(true); setResult("");
    try {
      if (!/^\d+$/.test(id)) throw new Error("Enter a valid invoice ID.");
      const count = await client.readContract({ address: hubAddress, abi: hubAbi, functionName: "nextReceivableId" });
      if (BigInt(id) >= count) throw new Error("This invoice does not exist. Create an invoice first.");
      const r = fromTuple(BigInt(id), await client.readContract({ address: hubAddress, abi: hubAbi, functionName: "receivables", args: [BigInt(id)] }));
      let functionName: string; let args: readonly unknown[] = [r.id]; let account: Address = r.supplier;
      switch (kind) {
        case "duplicate": functionName = "createReceivable"; args = [r.invoiceHash, r.buyer, r.faceValue, r.advanceAmount, r.bondAmount, r.dueDate, r.fundingDeadline]; break;
        case "fund": functionName = "fundReceivable"; account = /^0x0+$/.test(r.funder) ? address || r.supplier : r.funder; break;
        case "cancel": functionName = "cancelDraft"; break;
        case "default": functionName = "markDefault"; break;
        case "settle": functionName = "settleReceivable"; account = r.buyer; break;
        default: functionName = "approveReceivable";
      }
      try {
        await client.simulateContract({ address: hubAddress, abi: hubAbi as Abi, functionName, args, account });
        setResult(`Simulation succeeded for ${functionName} from ${short(account)}. This invoice does not currently meet the rejection scenario. No transaction was sent.`);
      } catch (e) { setResult(`RPC simulation of ${functionName}\nCaller: ${account}\n\n${errorText(e)}\n\nNo transaction was broadcast. This result comes from executing the deployed contract through eth_call.`); }
    } catch (e) { setResult(errorText(e)); } finally { setBusy(false); }
  }
  return <><div className="page-heading"><div><h1>Put the rules to the test.</h1><p>Run adversarial calls against the deployed contract and inspect what it rejects.</p></div><span className="tag neutral">Contract simulations</span></div><ConnectionNotice /><div className="notice">These calls execute against the real contract using RPC simulation. They don’t spend gas or create onchain transaction receipts. Each scenario uses the caller role described below.</div><label className="field" style={{ maxWidth: 260, marginBottom: 26 }}><span>Receivable ID</span><input value={id} onChange={e => setId(e.target.value)} inputMode="numeric" /></label><div className="lab-grid">{cases.map(([kind, title, description]) => <section className="lab-card" key={kind}><h3>{title}</h3><p>{description}</p><button className="button secondary" disabled={busy || !hubAddress} onClick={() => run(kind)}>{busy ? "Running…" : "Run contract check"}</button></section>)}</div>{result && <pre className="lab-result" role="status">{result}</pre>}</>;
}
