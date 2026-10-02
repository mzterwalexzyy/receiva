"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { FileText } from "lucide-react";
import { useReceivables, useProtocol, useHistory, money, date } from "@/lib/hooks";
import { hubAddress, states, short, type Receivable } from "@/lib/chain";
export function Status({ status }: { status: number }) { return <span className={`tag ${status === 4 ? "danger" : status === 5 ? "amber" : [0, 6, 7].includes(status) ? "neutral" : ""}`}>{states[status]}</span>; }
export function ConnectionNotice() {
  return !hubAddress ? <div className="notice warn">Contract deployment is not configured yet. This workspace will show live invoices when a verified deployment address is connected. The example on the overview is illustrative.</div> : null;
}
export function BuyerHistory({ buyer }: { buyer: `0x${string}` }) {
  const { data, isError } = useHistory(buyer);
  return <p className="subtle">Buyer record: {data ? `${data.onTime} on time · ${data.late} late · ${data.defaults} defaults` : isError ? "Could not load" : "Loading…"}</p>;
}
function Card({ r, decimals, symbol }: { r: Receivable; decimals: number; symbol: string }) {
  const yieldBps = (r.faceValue - r.advanceAmount) * 10000n / r.advanceAmount;
  return <article className="invoice-card"><div className="section-heading"><span className="subtle">Invoice #{String(r.id).padStart(3, "0")}</span><Status status={r.status} /></div>
    <p className="subtle">Advance requested</p><h3>{money(r.advanceAmount, decimals)} <small>{symbol}</small></h3><hr className="divider" />
    <div className="term-row"><span>Face value</span><strong>{money(r.faceValue, decimals)}</strong></div>
    <div className="term-row"><span>Potential return</span><strong className="green">{money(r.faceValue - r.advanceAmount, decimals)} · {Number(yieldBps) / 100}%</strong></div>
    <div className="term-row"><span>Buyer bond</span><strong>{money(r.bondAmount, decimals)}</strong></div>
    <div className="term-row"><span>Due</span><strong>{date(r.dueDate)}</strong></div><hr className="divider" />
    <BuyerHistory buyer={r.buyer} /><Link className="button secondary" href={`/receivables/${r.id}`}>Review opportunity</Link>
  </article>;
}
export function InvoiceList({ role, cards = false }: { role?: "supplier" | "buyer" | "market"; cards?: boolean }) {
  const { address } = useAccount(); const query = useReceivables(); const protocol = useProtocol();
  const rows = (query.data?.rows || []).filter(r => role === "market" ? r.status === 1 && Number(r.fundingDeadline) > Date.now() / 1000 : role ? !!address && r[role].toLowerCase() === address.toLowerCase() : true);
  if (hubAddress && (query.isLoading || protocol.isLoading)) return <div className="loading" role="status">Reading invoices from the chain…</div>;
  if (query.error || protocol.error) return <div className="notice error" role="alert">Couldn’t read the contract. Check the RPC connection and deployment address. <button className="button small secondary" onClick={() => { query.refetch(); protocol.refetch(); }}>Retry</button></div>;
  if (!rows.length) return <div className="empty"><FileText size={29} /><h3>{role && role !== "market" && !address ? "Your invoices start with your wallet" : role === "market" ? "No open funding requests yet" : "No invoices to show yet"}</h3><p>{role === "market" ? "Buyer-approved invoices with an open funding window appear here." : "Create an invoice, have the buyer approve it, and follow its progress here."}</p>{role !== "supplier" && <Link className="button secondary" href="/supplier">Create an invoice</Link>}</div>;
  if (!protocol.data) return null;
  const { decimals, symbol } = protocol.data;
  return <>{query.data && query.data.count > 100n && <p className="notice">Showing the latest 100 invoices. Open older invoices by their ID.</p>}{cards ? <div className="card-grid">{rows.map(r => <Card key={String(r.id)} r={r} decimals={decimals} symbol={symbol} />)}</div> : <div className="table-wrap"><table className="ledger"><thead><tr><th>Invoice</th><th>Buyer</th><th>Face value</th><th>Due date</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{rows.map(r => <tr key={String(r.id)}><td>#{String(r.id).padStart(3, "0")}</td><td>{short(r.buyer)}</td><td>{money(r.faceValue, decimals)} {symbol}</td><td>{date(r.dueDate)}</td><td><Status status={r.status} /></td><td><Link href={`/receivables/${r.id}`}>View</Link></td></tr>)}</tbody></table></div>}</>;
}
