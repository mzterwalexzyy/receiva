"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { useState } from "react";
import { hubAbi } from "@/lib/abi";
import { hubAddress, explorer, deploymentBlock, short } from "@/lib/chain";
import { useProtocol, fromTuple, money, date, errorText } from "@/lib/hooks";
import { Status, BuyerHistory, ConnectionNotice } from "./receivable-card";
import { InvoiceActions } from "./transaction-action";
const eventNames: Record<string, string> = { ReceivableCreated: "Invoice registered", ReceivableApproved: "Buyer approved and posted bond", ReceivableFunded: "Supplier funded", ReceivableSettled: "Settled on time", ReceivableDefaulted: "Default recorded and bond released", DefaultCured: "Outstanding balance paid", ReceivableCancelled: "Draft cancelled", ReceivableExpired: "Funding expired and bond returned" };
export function ReceivableDetail({ id }: { id: string }) {
  const client = usePublicClient(); const protocol = useProtocol(); const [hashMatch, setHashMatch] = useState("");
  const valid = /^\d+$/.test(id) && id.length < 30;
  const query = useQuery({ queryKey: ["receivable", id, hubAddress], enabled: valid && !!hubAddress, refetchInterval: 10000, queryFn: async () => {
    const count = await client!.readContract({ address: hubAddress!, abi: hubAbi, functionName: "nextReceivableId" });
    if (BigInt(id) >= count) throw new Error("This invoice does not exist.");
    return fromTuple(BigInt(id), await client!.readContract({ address: hubAddress!, abi: hubAbi, functionName: "receivables", args: [BigInt(id)] }));
  } });
  const timeline = useQuery({ queryKey: ["timeline", id, hubAddress], enabled: valid && !!hubAddress, refetchInterval: 15000, queryFn: async () => {
    const head = await client!.getBlockNumber(); const floor = head > 50000n ? head - 50000n : 0n; const from = deploymentBlock > floor ? deploymentBlock : floor;
    const ranges = []; for (let start = from; start <= head; start += 10000n) ranges.push([start, start + 9999n < head ? start + 9999n : head] as const);
    const pages = await Promise.all(ranges.map(([fromBlock, toBlock]) => client!.getContractEvents({ address: hubAddress!, abi: hubAbi, fromBlock, toBlock, args: { id: BigInt(id) } })));
    return { limited: from > deploymentBlock, logs: pages.flat().sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex) };
  } });
  if (!valid) return <div className="notice error">Invalid invoice ID.</div>;
  if (!hubAddress) return <ConnectionNotice />;
  if (query.error || protocol.error) return <div className="notice error" role="alert">{errorText(query.error || protocol.error)}</div>;
  if (!query.data || !protocol.data) return <div className="loading">Loading invoice #{id}…</div>;
  const r = query.data; const { decimals, symbol } = protocol.data;
  const addressLink = (address: string) => explorer ? <a className="address green" href={`${explorer}/address/${address}`} target="_blank" rel="noreferrer">{address}</a> : <span className="address">{address}</span>;
  return <><Link href="/market" className="back-link">Back to funding market</Link><div className="page-heading"><div><h1>Invoice #{id.padStart(3, "0")}</h1><p>One shared record, from buyer approval to final repayment.</p></div><Status status={r.status} /></div><div className="two-col"><div><section className="panel"><div className="section-heading"><h2>Financial terms</h2><span className="tag neutral">{symbol}</span></div><dl className="detail-terms"><div><dt>Face value</dt><dd>{money(r.faceValue, decimals)}</dd></div><div><dt>Supplier advance</dt><dd>{money(r.advanceAmount, decimals)}</dd></div><div><dt>Potential funder return</dt><dd className="green">{money(r.faceValue - r.advanceAmount, decimals)}</dd></div><div><dt>Buyer bond</dt><dd>{money(r.bondAmount, decimals)}</dd></div><div><dt>Outstanding payment</dt><dd>{money(r.outstandingAmount, decimals)}</dd></div><div><dt>Payment due</dt><dd>{date(r.dueDate)}</dd></div><div><dt>Funding closes</dt><dd>{date(r.fundingDeadline)}</dd></div></dl><hr className="divider" /><InvoiceActions r={r} /></section><section className="panel"><h2>Participants</h2><dl className="detail-terms"><div style={{ gridColumn: "1/-1" }}><dt>Supplier</dt><dd>{addressLink(r.supplier)}</dd></div><div style={{ gridColumn: "1/-1" }}><dt>Buyer</dt><dd>{addressLink(r.buyer)}</dd></div><div style={{ gridColumn: "1/-1" }}><dt>Funder</dt><dd>{/^0x0+$/.test(r.funder) ? "Not funded yet" : addressLink(r.funder)}</dd></div></dl><hr className="divider" /><BuyerHistory buyer={r.buyer} /></section><section className="panel"><h2>Verify the invoice</h2><p className="subtle" style={{ margin: "12px 0" }}>Compare a PDF received directly from the supplier. The file stays in your browser.</p><p className="hash">{r.invoiceHash}</p><label className="field" style={{ marginTop: 20 }}><span>Choose a PDF to compare</span><input type="file" accept="application/pdf,.pdf" onChange={async e => {
    const file = e.target.files?.[0]; setHashMatch(""); if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setHashMatch("Choose a file smaller than 20 MB."); return; }
    try { const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); const value = `0x${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("")}`; setHashMatch(value === r.invoiceHash ? "Match. This file has the registered invoice hash." : "Mismatch. This file is different from the registered invoice."); } catch (e) { setHashMatch(errorText(e)); }
  }} /></label><p role="status" style={{ marginTop: 12 }} className="subtle">{hashMatch}</p></section></div><aside className="panel"><h2>Transaction timeline</h2><p className="subtle" style={{ marginTop: 10 }}>Events emitted by ReceivableHub.</p>{timeline.isLoading && <p className="loading">Reading events…</p>}{timeline.error && <p className="notice error" style={{ marginTop: 16 }}>Couldn’t load events from this RPC. Use the contract explorer to inspect its logs.</p>}{timeline.data?.limited && <p className="notice warn" style={{ marginTop: 16 }}>Showing the last 50,000 blocks. Earlier history is available on the explorer.</p>}<ol className="timeline">{timeline.data?.logs.map(log => <li key={`${log.transactionHash}-${log.logIndex}`}><h3>{eventNames[log.eventName] || log.eventName}</h3><p className="subtle">Block {String(log.blockNumber)}</p>{explorer ? <a href={`${explorer}/tx/${log.transactionHash}`} target="_blank" rel="noreferrer">{short(log.transactionHash)} · View receipt</a> : <span className="hash">{log.transactionHash}</span>}</li>)}</ol></aside></div></>;
}
