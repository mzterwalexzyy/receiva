"use client";
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, ReceiptText, ShieldCheck, FileText, Landmark, CheckCircle2 } from 'lucide-react';
import { useProtocol, useReceivables, money, date } from '@/lib/hooks';
import { hubAddress, short, states } from '@/lib/chain';
import { Brand } from './brand';

export function LiveOverview({ preview = false }: { preview?: boolean }) {
  const query = useReceivables(); const protocol = useProtocol();
  const rows = query.data?.rows ?? [];
  const ready = !!query.data && !!protocol.data;
  const amount = (n: bigint) => protocol.data ? money(n, protocol.data.decimals) : 'Unavailable';
  const funded = rows.filter(r => [2,3,4,5].includes(r.status));
  const stats = [
    ['Financed in this view', ready ? amount(funded.reduce((s,r) => s+r.advanceAmount,0n))+' USDG' : 'Loading'],
    ['Registered invoices', query.data ? query.data.count.toString() : 'Loading'],
    ['Awaiting funding', ready ? rows.filter(r=>r.status===1).length.toString() : 'Loading'],
    ['Settled invoices', ready ? rows.filter(r=>[3,5].includes(r.status)).length.toString() : 'Loading'],
  ];
  return <div className={`rv-overview ${preview ? 'rv-preview' : ''}`}>
    <div className="rv-overview-title"><div><p>Your working capital, in focus</p><h1>Invoice overview<span>.</span></h1></div><Link className="rv-primary" href="/supplier">New invoice <ArrowUpRight size={16}/></Link></div>
    {!hubAddress ? <p role="alert">A contract must be configured to display invoices.</p> : query.isError || protocol.isError ? <div role="alert">Contract data is unavailable. <button onClick={()=>{void query.refetch();void protocol.refetch();}}>Try again</button></div> : <>
    <div className="rv-metrics">{stats.map(([label,value],i)=><div key={label}><span className={`rv-stat-dot rv-dot-${i}`}/><div><p>{label}</p><strong>{value}</strong></div></div>)}</div>
    <div className="rv-overview-grid"><section className="rv-ledger"><div className="rv-panel-head"><h2>Recent invoices</h2><Link href="/market">View all <ArrowUpRight size={14}/></Link></div><p className="rv-muted">Onchain records · Latest {rows.length} of {query.data?.count.toString() ?? '…'}</p><div className="rv-table-wrap"><table><thead><tr><th>Invoice</th><th>Buyer</th><th>Face value</th><th>Status</th><th aria-label="Details"/></tr></thead><tbody>{rows.slice(0,preview?3:8).map(r=><tr key={r.id.toString()}><td><FileText size={15}/> #{r.id.toString().padStart(3,'0')}</td><td>{short(r.buyer)}</td><td>{amount(r.faceValue)} USDG</td><td><span className={`rv-status rv-status-${r.status}`}>{states[r.status]}</span></td><td><Link aria-label={`View invoice ${r.id}`} href={`/receivables/${r.id}`}><ArrowUpRight size={17}/></Link></td></tr>)}</tbody></table></div>{!rows.length && <p className="rv-empty">{query.isPending ? 'Loading invoice records…' : 'Your first invoice starts here. Create one to begin.'}</p>}</section><aside className="rv-blue-card"><span>Built on Arbitrum</span><Landmark size={34}/><h2>Less waiting.<br/>More working capital.</h2><p>Create an invoice, get buyer approval and connect with a funder.</p><Link href="/supplier">Create an invoice <ArrowRight size={16}/></Link></aside></div>
    {!preview && <section className="rv-ledger rv-activity"><div className="rv-panel-head"><h2>Payment schedule</h2><span>From the displayed records</span></div>{rows.slice(0,5).map(r=><div className="rv-schedule" key={r.id.toString()}><span>Invoice #{r.id.toString()}</span><time>{date(r.dueDate)}</time><span>{states[r.status]}</span></div>)}{!rows.length && <p>No payment dates to show yet.</p>}</section>}
    </>}
  </div>;
}

export function ReferenceLanding() {
  return <div className="rv-landing"><header className="rv-nav"><Link href="/" className="rv-brand"><Brand/></Link><nav aria-label="Landing navigation"><a href="#how">How it works</a><a href="#workspace">The workspace</a><Link href="/market">Funding market</Link></nav><Link className="rv-outline" href="/dashboard">Open app <ArrowUpRight size={15}/></Link></header>
    <section className="rv-hero"><div className="rv-orbits" aria-hidden="true"/><p className="rv-eyebrow"><span/> Invoice financing on Arbitrum Sepolia</p><h1>Good work deserves<br/>a faster payday.</h1><p className="rv-intro">Turn buyer-approved invoices into working capital.<br/>Clear terms. Shared records. Every payment onchain.</p><div className="rv-hero-buttons"><Link className="rv-white" href="/supplier">Finance an invoice <ArrowUpRight size={17}/></Link><Link className="rv-text-link" href="/market">Explore the market <ArrowRight size={16}/></Link></div>
    <div className="rv-stage" id="workspace"><div className="rv-stage-top"><span className="rv-window-dots">● ● ●</span><span>receiva / workspace</span><span>Testnet</span></div><LiveOverview preview/><div className="rv-floating"><span className="rv-check"><CheckCircle2 size={20}/></span><div><strong>One shared record</strong><p>Supplier. Buyer. Funder.</p></div></div></div>
    <div className="rv-network"><span>Built for business cash flow</span><strong>Arbitrum</strong><span>Settlement in</span><strong>USDG</strong><span>Test assets only</span></div></section>
    <section className="rv-story" id="how"><p className="rv-eyebrow">From invoice to working capital</p><h2>You’ve done the work.<br/>Keep your business moving.</h2><div className="rv-roles"><Link href="/supplier" className="rv-role"><span className="rv-role-number">01 / Supplier</span><h3>Make your next<br/>move, sooner.</h3><p>Create a receivable and set the financing terms. Your invoice file stays on your device.</p><div className="rv-process-visual"><span><FileText size={22}/> Create your invoice</span><span><ShieldCheck size={22}/> Get buyer approval</span><span><Landmark size={22}/> Receive funding</span></div><span className="rv-role-link">Create an invoice <ArrowUpRight size={18}/></span></Link><div className="rv-role-stack"><Link href="/buyer" className="rv-role rv-buyer"><ShieldCheck size={30}/><span className="rv-role-number">02 / Buyer</span><h3>Your terms.<br/>A clearer commitment.</h3><p>Review the invoice, post a partial bond and repay by the agreed date.</p><span className="rv-role-link">Open buyer desk <ArrowUpRight size={18}/></span></Link><Link href="/market" className="rv-role rv-funder"><span className="rv-role-number">03 / Funder</span><h3>See the terms.<br/>Choose your position.</h3><p>Compare approved receivables and their buyer bonds. Repayment depends on the buyer.</p><span className="rv-role-link">Explore opportunities <ArrowUpRight size={18}/></span></Link></div></div></section>
    <section className="rv-close"><ReceiptText size={40}/><h2>Put your invoices<br/>to work.</h2><Link className="rv-white" href="/dashboard">Enter the workspace <ArrowUpRight size={17}/></Link><p>Arbitrum Sepolia · Testnet application</p></section><footer className="rv-footer"><Link className="rv-brand" href="/"><Brand/></Link><p>Invoice financing, with a shared record.</p><Link href="/lab">Explore security</Link></footer>
  </div>;
}
