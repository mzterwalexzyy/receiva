"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { useState } from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  FileCheck2, 
  UploadCloud, 
  ShieldCheck, 
  Clock, 
  Coins, 
  Building2, 
  User, 
  Calendar,
  Layers,
  FileText
} from "lucide-react";
import { hubAbi } from "@/lib/abi";
import { hubAddress, explorer, deploymentBlock, short } from "@/lib/chain";
import { useProtocol, fromTuple, money, date, errorText } from "@/lib/hooks";
import { Status, BuyerHistory, ConnectionNotice } from "./receivable-card";
import { InvoiceActions } from "./transaction-action";

const eventNames: Record<string, string> = { 
  ReceivableCreated: "Invoice Registered on Chain", 
  ReceivableApproved: "Buyer Approved & Posted Security Bond", 
  ReceivableFunded: "Supplier Funded by Liquidity Provider", 
  ReceivableSettled: "Settled on Time · Bond Returned", 
  ReceivableDefaulted: "Default Recorded · Bond Released to Funder", 
  DefaultCured: "Outstanding Balance Paid Late", 
  ReceivableCancelled: "Draft Cancelled by Supplier", 
  ReceivableExpired: "Funding Window Expired · Bond Returned" 
};

export function ReceivableDetail({ id }: { id: string }) {
  const client = usePublicClient();
  const protocol = useProtocol();
  const [hashMatch, setHashMatch] = useState<"match" | "mismatch" | "">("");
  const [computedHash, setComputedHash] = useState("");
  const [verifying, setVerifying] = useState(false);

  const valid = /^\d+$/.test(id) && id.length < 30;

  const query = useQuery({
    queryKey: ["receivable", id, hubAddress],
    enabled: valid && !!hubAddress && !!client,
    refetchInterval: 10000,
    queryFn: async () => {
      const count = await client!.readContract({ 
        address: hubAddress!, 
        abi: hubAbi, 
        functionName: "nextReceivableId" 
      });
      if (BigInt(id) >= count) throw new Error("This invoice does not exist onchain.");
      return fromTuple(
        BigInt(id), 
        await client!.readContract({ address: hubAddress!, abi: hubAbi, functionName: "receivables", args: [BigInt(id)] })
      );
    }
  });

  const timeline = useQuery({
    queryKey: ["timeline", id, hubAddress],
    enabled: valid && !!hubAddress && !!client,
    refetchInterval: 15000,
    queryFn: async () => {
      const head = await client!.getBlockNumber();
      const floor = head > 50000n ? head - 50000n : 0n;
      const from = deploymentBlock > floor ? deploymentBlock : floor;
      const ranges = [];
      for (let start = from; start <= head; start += 10000n) {
        ranges.push([start, start + 9999n < head ? start + 9999n : head] as const);
      }
      const pages = await Promise.all(
        ranges.map(([fromBlock, toBlock]) => 
          client!.getContractEvents({ 
            address: hubAddress!, 
            abi: hubAbi, 
            fromBlock, 
            toBlock, 
            args: { id: BigInt(id) } 
          })
        )
      );
      return { 
        limited: from > deploymentBlock, 
        logs: pages.flat().sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex) 
      };
    }
  });

  if (!valid) {
    return <div className="alert-box alert-error">Invalid invoice ID format.</div>;
  }

  if (!hubAddress) return <ConnectionNotice />;

  if (query.error || protocol.error) {
    return (
      <div className="alert-box alert-error" role="alert">
        <AlertCircle size={18} />
        <span>{errorText(query.error || protocol.error)}</span>
      </div>
    );
  }

  if (!query.data || !protocol.data) {
    return (
      <div className="glass-panel" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
        <Clock className="animate-spin" size={24} style={{ margin: "0 auto 12px", color: "var(--blue-primary)" }} />
        <div>Loading onchain invoice #{id}…</div>
      </div>
    );
  }

  const r = query.data;
  const { decimals, symbol } = protocol.data;

  const addressLink = (address: string) => {
    return explorer ? (
      <a 
        href={`${explorer}/address/${address}`} 
        target="_blank" 
        rel="noreferrer"
        style={{ color: "var(--blue-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "monospace" }}
      >
        <span>{address}</span>
        <ExternalLink size={12} />
      </a>
    ) : (
      <span style={{ fontFamily: "monospace", color: "var(--text-main)" }}>{address}</span>
    );
  };

  const isFunderAssigned = !/^0x0+$/.test(r.funder);

  return (
    <div>
      {/* Back Link */}
      <Link 
        href="/market" 
        style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: 6, 
          fontSize: 13, 
          color: "var(--text-muted)", 
          textDecoration: "none", 
          marginBottom: 20 
        }}
      >
        <ArrowLeft size={14} />
        <span>Back to Funding Market</span>
      </Link>

      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-main)", margin: 0, letterSpacing: -0.5 }}>
              Invoice #{id.padStart(3, "0")}
            </h1>
            <Status status={r.status} />
          </div>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 15 }}>
            One immutable record on Arbitrum Sepolia, from buyer approval to onchain settlement.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Financial Terms Panel */}
          <section className="glass-panel" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                Financial Terms
              </h2>
              <span className="status-tag status-funded">{symbol} Claim</span>
            </div>

            <div className="field-pair" style={{ fontSize: 13 }}>
              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Face Value</span>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-main)", marginTop: 4 }}>
                  {money(r.faceValue, decimals)} <small style={{ fontSize: 13, color: "var(--text-dim)" }}>{symbol}</small>
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Supplier Advance</span>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--emerald-main)", marginTop: 4 }}>
                  {money(r.advanceAmount, decimals)} <small style={{ fontSize: 13, color: "var(--text-dim)" }}>{symbol}</small>
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Potential Funder Return</span>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue-primary)", marginTop: 4 }}>
                  +{money(r.faceValue - r.advanceAmount, decimals)} {symbol}
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Buyer Security Bond</span>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--amber-main)", marginTop: 4 }}>
                  {money(r.bondAmount, decimals)} {symbol}
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Payment Due Date</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginTop: 4 }}>
                  {date(r.dueDate)}
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Funding Window Closes</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginTop: 4 }}>
                  {date(r.fundingDeadline)}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-subtle)", margin: "24px 0" }} />

            {/* Smart Contract Actions for Connected Wallet */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)", marginBottom: 12 }}>
                Available Protocol Actions
              </h3>
              <InvoiceActions r={r} />
            </div>
          </section>

          {/* Onchain Participants Panel */}
          <section className="glass-panel" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: "0 0 18px" }}>
              Verified Participants
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Supplier (Claim Registrant):</span>
                {addressLink(r.supplier)}
              </div>

              <div>
                <span style={{ color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Buyer / Commercial Debtor:</span>
                {addressLink(r.buyer)}
              </div>

              <div>
                <span style={{ color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Liquidity Provider (Funder):</span>
                {isFunderAssigned ? (
                  addressLink(r.funder)
                ) : (
                  <span style={{ color: "var(--amber-main)", fontWeight: 500 }}>
                    Awaiting Liquidity Funding in Market
                  </span>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-subtle)", margin: "20px 0" }} />

            <BuyerHistory buyer={r.buyer} />
          </section>

          {/* PDF Authenticity Verification Panel */}
          <section className="glass-panel" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: "0 0 8px" }}>
              Compare the invoice document
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
              Compare a PDF invoice received directly from the supplier. The file is processed purely on-device using Web Cryptography SHA-256 and never touches any server.
            </p>

            <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border-subtle)", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all", marginBottom: 16 }}>
              <span style={{ color: "var(--text-dim)" }}>Registered Hash: </span>
              <span style={{ color: "var(--text-main)" }}>{r.invoiceHash}</span>
            </div>

            <label className="dropzone" style={{ display: "block" }}>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="accessible-file"
                aria-label="Choose PDF to compare with invoice"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  setHashMatch("");
                  setComputedHash("");
                  if (!file) return;

                  if (file.size > 20 * 1024 * 1024) {
                    alert("Please select a file smaller than 20 MB.");
                    return;
                  }

                  setVerifying(true);
                  try {
                    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
                    const value = `0x${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}`;
                    setComputedHash(value);
                    setHashMatch(value.toLowerCase() === r.invoiceHash.toLowerCase() ? "match" : "mismatch");
                  } catch (err) {
                    alert(errorText(err));
                  } finally {
                    setVerifying(false);
                  }
                }}
              />
              <FileCheck2 size={28} style={{ margin: "0 auto 8px", color: "var(--blue-primary)" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>
                Choose the supplier’s invoice PDF to compare
              </div>
            </label>

            {verifying && (
              <div style={{ fontSize: 12, color: "var(--amber-main)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={13} className="animate-spin" />
                <span>Computing SHA-256 in browser…</span>
              </div>
            )}

            {hashMatch === "match" && (
              <div className="alert-box alert-success" style={{ marginTop: 14 }}>
                <CheckCircle2 size={16} />
                <div>
                  <strong>Cryptographic Match Verified:</strong> This PDF document matches the registered onchain hash byte-for-byte.
                </div>
              </div>
            )}

            {hashMatch === "mismatch" && (
              <div className="alert-box alert-error" style={{ marginTop: 14 }}>
                <AlertCircle size={16} />
                <div>
                  <strong>Cryptographic Mismatch Detected:</strong> This file is different from the registered onchain invoice.
                  <div style={{ fontSize: 11, fontFamily: "monospace", marginTop: 4, wordBreak: "break-all" }}>
                    Your file: {computedHash}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Transaction Timeline Aside */}
        <aside className="glass-panel" style={{ padding: 24, alignSelf: "flex-start" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: "0 0 6px" }}>
            Onchain Timeline
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 20px" }}>
            Immutable events broadcast by ReceivableHub.
          </p>

          {timeline.isLoading && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} className="animate-spin" />
              <span>Fetching event logs from Arbitrum…</span>
            </div>
          )}

          {timeline.error && (
            <div className="alert-box alert-error" style={{ fontSize: 12 }}>
              Could not read events from RPC. Check Arbiscan explorer directly.
            </div>
          )}

          {timeline.data?.logs && timeline.data.logs.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>
              No transactions recorded for this invoice yet.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {timeline.data?.logs.map((log) => (
              <div 
                key={`${log.transactionHash}-${log.logIndex}`}
                style={{ 
                  borderLeft: "2px solid var(--blue-primary)", 
                  paddingLeft: 14, 
                  position: "relative" 
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>
                  {eventNames[log.eventName] || log.eventName}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                  Block #{String(log.blockNumber)}
                </div>
                {explorer ? (
                  <a 
                    href={`${explorer}/tx/${log.transactionHash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      fontSize: 11, 
                      color: "var(--blue-primary)", 
                      textDecoration: "none", 
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: 4, 
                      marginTop: 4 
                    }}
                  >
                    <span>{short(log.transactionHash)} · View on Arbiscan</span>
                    <ExternalLink size={10} />
                  </a>
                ) : (
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-dim)" }}>
                    {short(log.transactionHash)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
