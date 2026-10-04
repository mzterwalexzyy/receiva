"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { 
  FileText, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  Coins, 
  Building2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useReceivables, useProtocol, useHistory, money, date } from "@/lib/hooks";
import { hubAddress, states, short, type Receivable } from "@/lib/chain";
import { filterInvoices, repaymentRecord } from "@/lib/portfolio.cjs";

export function Status({ status }: { status: number }) {
  const statusClass = 
    status === 3 ? "status-paid" :
    status === 2 ? "status-funded" :
    status === 1 ? "status-approved" :
    status === 4 ? "status-overdue" :
    status === 5 ? "status-late" : "status-draft";

  return (
    <span className={`status-tag ${statusClass}`}>
      {states[status]}
    </span>
  );
}

export function ConnectionNotice() {
  if (hubAddress) return null;
  return (
    <div className="alert-box alert-warn" role="alert">
      <AlertCircle size={18} />
      <div>
        <strong>Contract deployment not detected:</strong> Connect to Arbitrum Sepolia with configured `NEXT_PUBLIC_HUB_ADDRESS` to interact with live blockchain receivables.
      </div>
    </div>
  );
}

export function BuyerHistory({ buyer }: { buyer: `0x${string}` }) {
  const { data, isError, isLoading } = useHistory(buyer);
  
  if (isLoading) {
    return <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Loading buyer record…</span>;
  }
  
  if (isError || !data) {
    return <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Buyer history unavailable</span>;
  }

  const record = repaymentRecord(data.onTime, data.late, data.defaults);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
      <span style={{ color: "var(--emerald-main)", fontWeight: 600 }}>{data.onTime.toString()} on-time</span>
      <span>·</span>
      <span>{data.late.toString()} late</span>
      <span>·</span>
      <span style={{ color: Number(data.defaults) > 0 ? "var(--red-main)" : "var(--text-dim)" }}>
        {data.defaults.toString()} defaults
      </span>
      <span style={{ marginLeft: "auto", fontWeight: 600, color: "var(--text-muted)" }}>
        {record.onTimeRate === null ? 'No payment history' : `${record.onTimeRate}% on-time`}
      </span>
    </div>
  );
}

export function Card({ r, decimals, symbol }: { r: Receivable; decimals: number; symbol: string }) {
  const profit = r.faceValue - r.advanceAmount;
  const yieldPct = (Number(profit) / Number(r.advanceAmount) * 100).toFixed(2);
  const bondPct = (Number(r.bondAmount) / Number(r.faceValue) * 100).toFixed(0);

  return (
    <article className="glass-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
          Invoice #{String(r.id).padStart(3, "0")}
        </span>
        <Status status={r.status} />
      </div>

      <div>
        <span style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Advance Requested
        </span>
        <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-main)", marginTop: 2 }}>
          {money(r.advanceAmount, decimals)} <small style={{ fontSize: 13, color: "var(--text-dim)" }}>{symbol}</small>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border-subtle)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Face value</span>
          <strong style={{ color: "var(--text-main)" }}>{money(r.faceValue, decimals)} {symbol}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Potential return</span>
          <strong style={{ color: "var(--emerald-main)" }}>
            +{money(profit, decimals)} ({yieldPct}%)
          </strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Buyer security bond</span>
          <strong style={{ color: "var(--amber-main)" }}>
            {money(r.bondAmount, decimals)} ({bondPct}% buffer)
          </strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Payment due</span>
          <strong style={{ color: "var(--text-main)" }}>{date(r.dueDate)}</strong>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border-subtle)" }} />

      <BuyerHistory buyer={r.buyer} />

      <Link 
        href={`/receivables/${r.id}`} 
        className="btn btn-primary" 
        style={{ width: "100%", marginTop: "auto" }}
      >
        <span>Review Opportunity</span>
        <ArrowUpRight size={15} />
      </Link>
    </article>
  );
}

export function InvoiceList({ role, cards = false, search = '', status = 'all' }: { role?: "supplier" | "buyer" | "market"; cards?: boolean; search?: string; status?: string }) {
  const { address } = useAccount(); 
  const query = useReceivables(); 
  const protocol = useProtocol();

  const rows = filterInvoices((query.data?.rows || []).filter(r => 
    role === "market" 
      ? r.status === 1 && Number(r.fundingDeadline) > Date.now() / 1000 
      : role 
        ? !!address && r[role].toLowerCase() === address.toLowerCase() 
        : true
  ), search, status);

  if (hubAddress && (query.isLoading || protocol.isLoading)) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        <Clock className="animate-spin" size={24} style={{ margin: "0 auto 12px", color: "var(--blue-primary)" }} />
        <div>Reading onchain invoices from Arbitrum Sepolia…</div>
      </div>
    );
  }

  if (query.error || protocol.error) {
    return (
      <div className="alert-box alert-error" role="alert">
        <AlertCircle size={18} />
        <div style={{ flex: 1 }}>
          Couldn’t read from contract. Check your RPC connection and deployment address.
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ padding: "4px 12px", fontSize: 11 }}
          onClick={() => { query.refetch(); protocol.refetch(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="glass-panel" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
        <FileText size={36} style={{ margin: "0 auto 16px", color: "var(--text-dim)" }} />
        <h3 style={{ color: "var(--text-main)", fontSize: 18, margin: "0 0 8px" }}>
          {role && role !== "market" && !address 
            ? "Connect wallet to view your invoices" 
            : role === "market" 
              ? "No open funding requests in the market right now" 
              : "No invoices registered yet"}
        </h3>
        <p style={{ fontSize: 14, maxWidth: 440, margin: "0 auto 20px" }}>
          {role === "market" 
            ? "Buyer-approved invoices with active funding deadlines will appear here for financing." 
            : "Create an invoice as a supplier, have your buyer approve it with a bond, and follow its progress."}
        </p>
        {role !== "supplier" && (
          <Link href="/supplier" className="btn btn-primary">
            Create an Invoice
          </Link>
        )}
      </div>
    );
  }

  if (!protocol.data) return null;
  const { decimals, symbol } = protocol.data;

  return (
    <>
      {query.data && query.data.count > 100n && (
        <div className="alert-box alert-info" style={{ marginBottom: 16 }}>
          Showing latest 100 invoices. Direct access to older records available via ID search.
        </div>
      )}

      {cards ? (
        <div className="invoice-cards">
          {rows.map((r) => (
            <Card key={String(r.id)} r={r} decimals={decimals} symbol={symbol} />
          ))}
        </div>
      ) : (
        <div className="table-container glass-panel" style={{ overflowX: "auto" }}>
          <table className="receiva-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Buyer / Debtor</th>
                <th>Supplier</th>
                <th>Face Value</th>
                <th>Advance Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  <td style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    #{String(r.id).padStart(3, "0")}
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{short(r.buyer)}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{short(r.supplier)}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    {money(r.faceValue, decimals)} {symbol}
                  </td>
                  <td style={{ color: "var(--emerald-main)", fontWeight: 600 }}>
                    {money(r.advanceAmount, decimals)} {symbol}
                  </td>
                  <td>{date(r.dueDate)}</td>
                  <td>
                    <Status status={r.status} />
                  </td>
                  <td>
                    <Link 
                      href={`/receivables/${r.id}`}
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6 }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
