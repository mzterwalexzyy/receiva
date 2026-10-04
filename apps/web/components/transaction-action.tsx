"use client";
import { useAccount } from "wagmi";
import { useState } from "react";
import { useTransaction, useProtocol, money } from "@/lib/hooks";
import { chain, explorer, type Receivable } from "@/lib/chain";
export function TransactionFeedback({ tx }: { tx: ReturnType<typeof useTransaction> }) {
  return tx.message ? <div role={tx.failed ? "alert" : "status"} className={`tx-feedback ${tx.failed ? "error" : ""}`}>{tx.message}{tx.hash && (explorer ? <a href={`${explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer">View transaction on Arbiscan</a> : <span className="hash"> {tx.hash}</span>)}</div> : null;
}
export function InvoiceActions({ r }: { r: Receivable }) {
  const { address, chainId } = useAccount(); const { data: protocol } = useProtocol(); const tx = useTransaction();
  const [review, setReview] = useState<{name:string;amount:bigint;account:string}|null>(null);
  const buyer = address?.toLowerCase() === r.buyer.toLowerCase();
  const supplier = address?.toLowerCase() === r.supplier.toLowerCase();
  const now = BigInt(Math.floor(Date.now() / 1000));
  const disabled = tx.pending || !address || chainId !== chain.id || !protocol;
  const run = (name: string, amount = 0n) => setReview({name,amount,account:address??''});
  const labels:Record<string,string>={approveReceivable:'Approve invoice and post bond',fundReceivable:'Fund this invoice',settleReceivable:'Settle invoice',cureDefault:'Pay outstanding balance',expireReceivable:'Return the expired bond',markDefault:'Record default and release bond',cancelDraft:'Cancel draft'};
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
    </div>{review&&<section className="transaction-review" aria-label="Review transaction"><h3>{labels[review.name]}</h3><p>Invoice #{r.id.toString()} · {chain.name}</p><p>{review.amount>0n&&protocol?`Token amount: ${money(review.amount,protocol.decimals)} ${protocol.symbol}. `:''}Your wallet will show the network fee before you sign.</p><p>Account: <strong>{review.account}</strong></p>{review.name==='fundReceivable'&&<p>The advance goes to the supplier. A partial buyer bond does not guarantee repayment.</p>}{review.name==='approveReceivable'&&<p>Your bond stays locked until expiry or settlement. Funding cannot be cancelled.</p>}<div className="actions"><button className="button" disabled={disabled||review.account!==address} onClick={async()=>{const success=await tx.run(review.name,[r.id],review.amount>0n&&protocol?{token:protocol.token,amount:review.amount}:undefined);if(success)setReview(null);}}>{tx.pending?'Waiting for wallet…':'Continue in wallet'}</button><button className="button secondary" disabled={tx.pending} onClick={()=>setReview(null)}>Cancel</button></div></section>}<TransactionFeedback tx={tx} />
  </div>;
}
