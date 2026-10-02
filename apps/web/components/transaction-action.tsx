"use client";
import { useAccount } from "wagmi";
import { useTransaction, useProtocol } from "@/lib/hooks";
import { chain, explorer, type Receivable } from "@/lib/chain";
export function TransactionFeedback({ tx }: { tx: ReturnType<typeof useTransaction> }) {
  return tx.message ? <div role={tx.failed ? "alert" : "status"} className={`tx-feedback ${tx.failed ? "error" : ""}`}>{tx.message}{tx.hash && (explorer ? <a href={`${explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer">View transaction on Arbiscan</a> : <span className="hash"> {tx.hash}</span>)}</div> : null;
}
export function InvoiceActions({ r }: { r: Receivable }) {
  const { address, chainId } = useAccount(); const { data: protocol } = useProtocol(); const tx = useTransaction();
  const buyer = address?.toLowerCase() === r.buyer.toLowerCase();
  const supplier = address?.toLowerCase() === r.supplier.toLowerCase();
  const now = BigInt(Math.floor(Date.now() / 1000));
  const disabled = tx.pending || !address || chainId !== chain.id || !protocol;
  const run = (name: string, amount = 0n) => tx.run(name, [r.id], amount && protocol ? { token: protocol.token, amount } : undefined);
  return <div>
    {!address && <p className="subtle">Connect a wallet to act on this invoice.</p>}
    {r.status === 0 && buyer && <p className="notice warn">Confirm the invoice hash with your supplier. After funding, this invoice cannot be cancelled. Approval locks your bond until expiry or settlement.</p>}
    <div className="actions">
      {r.status === 0 && buyer && now < r.fundingDeadline && <button className="button" disabled={disabled} onClick={() => run("approveReceivable", r.bondAmount)}>Approve and post bond</button>}
      {r.status === 0 && supplier && <button className="button secondary" disabled={disabled} onClick={() => run("cancelDraft")}>Cancel draft</button>}
      {r.status === 1 && now < r.fundingDeadline && !buyer && !supplier && <button className="button" disabled={disabled} onClick={() => run("fundReceivable", r.advanceAmount)}>Finance this invoice</button>}
      {r.status === 1 && now >= r.fundingDeadline && <button className="button" disabled={disabled} onClick={() => run("expireReceivable")}>Expire and return bond</button>}
      {r.status === 2 && buyer && <button className="button" disabled={disabled} onClick={() => run("settleReceivable", now > r.dueDate ? r.faceValue - r.bondAmount : r.faceValue)}>{now > r.dueDate ? "Settle late balance" : "Settle invoice"}</button>}
      {r.status === 2 && now > r.dueDate && <button className="button secondary" disabled={disabled} onClick={() => run("markDefault")}>Mark default</button>}
      {r.status === 4 && buyer && <button className="button" disabled={disabled} onClick={() => run("cureDefault", r.outstandingAmount)}>Pay outstanding balance</button>}
    </div><TransactionFeedback tx={tx} />
  </div>;
}
