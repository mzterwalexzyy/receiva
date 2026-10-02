"use client";
import { useState, type FormEvent } from "react";
import { useAccount } from "wagmi";
import { isAddress, parseUnits } from "viem";
import { ConnectionNotice, InvoiceList } from "@/components/receivable-card";
import { TransactionFeedback } from "@/components/transaction-action";
import { useProtocol, useTransaction, errorText } from "@/lib/hooks";
import { chain, hubAddress } from "@/lib/chain";
export default function Supplier() {
  const { address, chainId } = useAccount(); const { data: protocol } = useProtocol(); const tx = useTransaction();
  const [hash, setHash] = useState<`0x${string}`>(); const [hashing, setHashing] = useState(false); const [error, setError] = useState("");
  const [face, setFace] = useState("1000"); const [advance, setAdvance] = useState("980"); const [bond, setBond] = useState("100");
  async function hashFile(file?: File) {
    setHash(undefined); setError(""); if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError("Choose a PDF smaller than 20 MB."); return; }
    setHashing(true);
    try {
      const bytes = await file.arrayBuffer();
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Choose a valid PDF invoice.");
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      setHash(`0x${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}`);
    } catch (e) { setError(errorText(e)); } finally { setHashing(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    try {
      if (!protocol || !hash) throw new Error("Choose a PDF and wait for the token configuration to load.");
      const form = new FormData(event.currentTarget); const buyer = String(form.get("buyer")).trim();
      if (!isAddress(buyer) || buyer.toLowerCase() === address?.toLowerCase() || /^0x0{40}$/i.test(buyer)) throw new Error("Enter a valid buyer address different from your wallet.");
      const faceValue = parseUnits(face, protocol.decimals), advanceAmount = parseUnits(advance, protocol.decimals), bondAmount = parseUnits(bond, protocol.decimals);
      if (faceValue <= 0n || advanceAmount <= 0n || advanceAmount >= faceValue || bondAmount <= 0n || bondAmount >= faceValue) throw new Error("The advance and bond must each be positive and below the face value.");
      const due = BigInt(Math.floor(new Date(String(form.get("due"))).getTime() / 1000));
      const funding = BigInt(Math.floor(new Date(String(form.get("funding"))).getTime() / 1000));
      if (funding <= BigInt(Math.floor(Date.now() / 1000)) || due <= funding) throw new Error("Funding must close in the future and before payment is due.");
      await tx.run("createReceivable", [hash, buyer, faceValue, advanceAmount, bondAmount, due, funding]);
    } catch (e) { setError(errorText(e)); }
  }
  return <><div className="page-heading"><div><h1>Put your invoice to work.</h1><p>Set your terms, invite your buyer and get ready for funding.</p></div><span className="tag neutral">Supplier workspace</span></div><ConnectionNotice />
  <div className="two-col"><section className="panel"><h2 className="form-heading">Create a receivable</h2><form onSubmit={submit}><div className="form-grid"><label className="field full"><span>Buyer wallet address</span><input name="buyer" placeholder="0x…" required autoComplete="off" /><small>The buyer must approve from this wallet.</small></label><label className="field full"><span>Invoice PDF</span><input type="file" accept="application/pdf,.pdf" required onChange={e => hashFile(e.target.files?.[0])} /><small>Hashed on your device. The file is never uploaded. Maximum 20 MB.</small>{hashing && <small role="status">Calculating SHA-256…</small>}{hash && <span className="hash">SHA-256: {hash}</span>}</label><label className="field"><span>Invoice face value</span><input value={face} onChange={e => setFace(e.target.value)} inputMode="decimal" required pattern="[0-9]+([.][0-9]+)?" /></label><label className="field"><span>Amount you receive</span><input value={advance} onChange={e => setAdvance(e.target.value)} inputMode="decimal" required pattern="[0-9]+([.][0-9]+)?" /></label><label className="field full"><span>Buyer security bond</span><input value={bond} onChange={e => setBond(e.target.value)} inputMode="decimal" required pattern="[0-9]+([.][0-9]+)?" /><small>Amounts are in {protocol?.symbol || "USDG"}. The bond covers only part of the invoice.</small></label><label className="field"><span>Funding closes</span><input type="datetime-local" name="funding" required /></label><label className="field"><span>Payment due</span><input type="datetime-local" name="due" required /></label></div><p className="subtle" style={{ marginTop: 12 }}>Dates use your device’s local timezone.</p>{error && <div className="notice error" style={{ marginTop: 16 }} role="alert">{error}</div>}<button className="button" style={{ marginTop: 24 }} disabled={tx.pending || hashing || !hash || !protocol || !address || !hubAddress || chainId !== chain.id}>{tx.pending ? "Submitting…" : "Create receivable"}</button>{!address && <p className="subtle" style={{ marginTop: 10 }}>Connect your supplier wallet to create an invoice.</p>}<TransactionFeedback tx={tx} /></form></section>
  <aside className="panel"><h3>Your financing terms</h3><div className="form-summary"><div className="term-row"><span>Invoice value</span><strong>{face || "0"}</strong></div><div className="term-row"><span>You receive</span><strong>{advance || "0"}</strong></div><div className="term-row"><span>Potential funder return</span><strong className="green">{(Number(face) - Number(advance)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</strong></div><div className="term-row"><span>Discount on face value</span><strong>{Number(face) > 0 ? ((Number(face) - Number(advance)) / Number(face) * 100).toFixed(2) : "0"}%</strong></div><div className="term-row"><span>Buyer bond</span><strong>{bond || "0"}</strong></div></div><hr className="divider" /><div className="risk-copy"><p>Share the original invoice directly with your buyer so they can verify its hash.</p><p>You can cancel a draft. Once approved, the buyer’s bond stays locked until funding expires or the invoice settles.</p><p>Financial terms and wallet addresses are public onchain.</p></div></aside></div><section style={{ marginTop: 36 }}><div className="section-heading"><h2>Your invoices</h2></div><InvoiceList role="supplier" /></section></>;
}
