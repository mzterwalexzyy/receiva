"use client";

import { useState, useRef, type FormEvent } from "react";
import { useAccount } from "wagmi";
import { isAddress, parseUnits } from "viem";
import { 
  UploadCloud, 
  FileCheck, 
  Coins, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Info
} from "lucide-react";
import { ConnectionNotice, InvoiceList } from "@/components/receivable-card";
import { TransactionFeedback } from "@/components/transaction-action";
import { useProtocol, useTransaction, errorText } from "@/lib/hooks";
import { chain, hubAddress } from "@/lib/chain";

export default function Supplier() {
  const { address, chainId } = useAccount();
  const { data: protocol } = useProtocol();
  const tx = useTransaction();

  const [hash, setHash] = useState<`0x${string}`>();
  const [fileName, setFileName] = useState("");
  const [hashing, setHashing] = useState(false);
  const [error, setError] = useState("");

  const [face, setFace] = useState("");
  const [advance, setAdvance] = useState("");
  const [bond, setBond] = useState("");
  const fileVersion = useRef(0);
  const [buyerInput, setBuyerInput] = useState("");

  async function hashFile(file?: File) {
    const version = ++fileVersion.current;
    setHash(undefined);
    setFileName("");
    setError("");
    setHashing(false);
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("Please choose a PDF file smaller than 20 MB.");
      return;
    }

    setHashing(true);
    setFileName(file.name);

    try {
      const bytes = await file.arrayBuffer();
      const header = new TextDecoder().decode(bytes.slice(0, 5));
      if (header !== "%PDF-") {
        throw new Error("Selected file is not a valid PDF document.");
      }
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const computedHash = `0x${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
      if (version === fileVersion.current) setHash(computedHash);
    } catch (e) {
      if (version === fileVersion.current) setError(errorText(e));
    } finally {
      if (version === fileVersion.current) setHashing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      if (!protocol || !hash) {
        throw new Error("Please upload a valid PDF invoice and ensure protocol settings are loaded.");
      }

      const form = new FormData(event.currentTarget);
      const buyer = String(form.get("buyer") || "").trim();

      if (!isAddress(buyer) || buyer.toLowerCase() === address?.toLowerCase() || /^0x0{40}$/i.test(buyer)) {
        throw new Error("Enter a valid buyer wallet address (must be different from your supplier address).");
      }

      const faceValue = parseUnits(face, protocol.decimals);
      const advanceAmount = parseUnits(advance, protocol.decimals);
      const bondAmount = parseUnits(bond, protocol.decimals);

      if (faceValue <= 0n || advanceAmount <= 0n || advanceAmount >= faceValue || bondAmount <= 0n || bondAmount >= faceValue) {
        throw new Error("Advance and security bond amounts must each be positive numbers strictly below the face value.");
      }

      const dueInput = String(form.get("due"));
      const fundingInput = String(form.get("funding"));

      if (!dueInput || !fundingInput) {
        throw new Error("Please select valid dates for both funding close and payment due.");
      }

      const due = BigInt(Math.floor(new Date(dueInput).getTime() / 1000));
      const funding = BigInt(Math.floor(new Date(fundingInput).getTime() / 1000));
      const now = BigInt(Math.floor(Date.now() / 1000));

      if (funding <= now || due <= funding) {
        throw new Error("Funding deadline must be in the future, and payment due date must be after funding closes.");
      }

      await tx.run("createReceivable", [hash, buyer, faceValue, advanceAmount, bondAmount, due, funding]);
    } catch (e) {
      setError(errorText(e));
    }
  }

  const numFace = Number(face) || 0;
  const numAdvance = Number(advance) || 0;
  const numBond = Number(bond) || 0;
  const discountVal = numFace > numAdvance ? numFace - numAdvance : 0;
  const discountPct = numFace > 0 ? ((discountVal / numFace) * 100).toFixed(2) : "0.00";

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
            Supplier invoices
          </h1>
          <span className="status-tag status-approved">Supplier Workspace</span>
        </div>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 15 }}>
          Create an invoice, agree the terms with your buyer and request funding.
        </p>
      </div>

      <ConnectionNotice />

      <div className="supplier-grid">
        {/* Creation Form Panel */}
        <section className="glass-panel" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-main)", margin: "0 0 20px" }}>
            Create an invoice
          </h2>

          <form onSubmit={submit}>
            {/* Buyer Address */}
            <div className="form-group">
              <label className="form-label" htmlFor="buyer-wallet">Buyer wallet address</label>
              <input
                name="buyer"
                id="buyer-wallet"
                className="form-input"
                value={buyerInput}
                onChange={(e) => setBuyerInput(e.target.value)}
                required
                autoComplete="off"
              />
              <span className="form-helper">
                Your buyer must approve the invoice from this wallet.
              </span>
            </div>

            {/* Invoice PDF Upload Dropzone */}
            <div className="form-group">
              <label className="form-label" htmlFor="invoice-file">Invoice PDF</label>
              <label className="dropzone">
                <input
                  type="file"
                  id="invoice-file"
                  accept="application/pdf,.pdf"
                  required
                  className="accessible-file"
                  onChange={(e) => hashFile(e.target.files?.[0])}
                />
                <UploadCloud size={32} style={{ margin: "0 auto 10px", color: "var(--blue-primary)" }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>
                  {fileName ? fileName : "Choose an invoice PDF"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                  Calculated locally on your browser. Your file is NEVER uploaded to any central server.
                </div>
              </label>

              {hashing && (
                <div style={{ fontSize: 12, color: "var(--amber-main)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={13} className="animate-spin" />
                  Calculating SHA-256 fingerprint…
                </div>
              )}

              {hash && (
                <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: 11, fontFamily: "monospace", color: "var(--emerald-main)", wordBreak: "break-all" }}>
                  <strong>SHA-256:</strong> {hash}
                </div>
              )}
            </div>

            {/* Financial Terms Inputs */}
            <div className="field-pair">
              <div className="form-group">
                <label className="form-label" htmlFor="invoice-face">Invoice face value</label>
                <input
                  value={face}
                  id="invoice-face"
                  onChange={(e) => setFace(e.target.value)}
                  className="form-input"
                  inputMode="decimal"
                  required
                />
                <span className="form-helper">Total amount buyer pays upon maturity.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="invoice-advance">Requested advance</label>
                <input
                  value={advance}
                  id="invoice-advance"
                  onChange={(e) => setAdvance(e.target.value)}
                  className="form-input"
                  inputMode="decimal"
                  required
                />
                <span className="form-helper">USDG sent to your wallet immediately upon funding.</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="invoice-bond">Buyer security bond</label>
              <input
                value={bond}
                id="invoice-bond"
                onChange={(e) => setBond(e.target.value)}
                className="form-input"
                inputMode="decimal"
                required
              />
              <span className="form-helper">
                Bond posted by buyer in {protocol?.symbol || "USDG"} to provide partial default protection.
              </span>
            </div>

            {/* Date Inputs */}
            <div className="field-pair">
              <div className="form-group">
                <label className="form-label" htmlFor="invoice-funding">Funding closes</label>
                <input
                  type="datetime-local"
                  name="funding"
                  id="invoice-funding"
                  className="form-input"
                  required
                />
                <span className="form-helper">Last date for a funder to advance funds.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="invoice-due">Payment due</label>
                <input
                  type="datetime-local"
                  name="due"
                  id="invoice-due"
                  className="form-input"
                  required
                />
                <span className="form-helper">Date when buyer must settle the invoice.</span>
              </div>
            </div>

            {error && (
              <div className="alert-box alert-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px 20px", marginTop: 12 }}
              disabled={tx.pending || hashing || !hash || !protocol || !address || !hubAddress || chainId !== chain.id}
            >
              {tx.pending ? "Creating invoice…" : "Create invoice"}
            </button>

            {!address && (
              <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginTop: 10 }}>
                Connect your supplier wallet above to register this invoice.
              </p>
            )}

            <TransactionFeedback tx={tx} />
          </form>
        </section>

        {/* Real-time Financial Terms Summary Card */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-main)", margin: "0 0 16px" }}>
              Financing Terms Summary
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Face value:</span>
                <strong style={{ color: "var(--text-main)" }}>{numFace.toLocaleString()} {protocol?.symbol || "USDG"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Supplier advance today:</span>
                <strong style={{ color: "var(--emerald-main)" }}>{numAdvance.toLocaleString()} {protocol?.symbol || "USDG"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Funder yield:</span>
                <strong style={{ color: "var(--blue-primary)" }}>+{discountVal.toLocaleString()} {protocol?.symbol || "USDG"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Discount on face value:</span>
                <strong style={{ color: "var(--text-main)" }}>{discountPct}%</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Buyer security bond:</span>
                <strong style={{ color: "var(--amber-main)" }}>{numBond.toLocaleString()} {protocol?.symbol || "USDG"}</strong>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-subtle)", margin: "20px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--emerald-main)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>You can cancel a draft at any time before buyer approval.</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--emerald-main)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Once funded, cancellation is forbidden and liquidity is locked.</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Info size={15} color="var(--blue-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Share the original invoice PDF directly with your buyer so they can confirm its SHA-256 fingerprint.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Supplier's Registered Invoices */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
            Your Registered Invoices
          </h2>
        </div>
        <InvoiceList role="supplier" />
      </section>
    </div>
  );
}
