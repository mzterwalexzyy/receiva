"use client";
import { useAccount } from "wagmi";
import { useHistory } from "@/lib/hooks";
import { ConnectionNotice, InvoiceList } from "@/components/receivable-card";
export default function Buyer() {
  const { address } = useAccount(); const { data } = useHistory(address);
  return <><div className="page-heading"><div><h1>Keep your terms. Build your record.</h1><p>Review invoices addressed to your wallet, post a bond and settle your obligations.</p></div><span className="tag neutral">Buyer workspace</span></div><ConnectionNotice /><div className="stats"><div className="stat"><span>Paid on time</span><strong>{data ? String(data.onTime) : "—"}</strong></div><div className="stat"><span>Paid late</span><strong>{data ? String(data.late) : "—"}</strong></div><div className="stat"><span>Recorded defaults</span><strong>{data ? String(data.defaults) : "—"}</strong></div></div><div className="section-heading"><h2>Your approval and payment desk</h2></div><InvoiceList role="buyer" /><p className="subtle" style={{ marginTop: 20 }}>A late payment remains part of your history. Settling a default clears the outstanding amount, while preserving the default record.</p></>;
}
