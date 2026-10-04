"use client";
import { useState } from 'react';
import { Landmark, Coins, ShieldCheck } from 'lucide-react';
import { InvoiceList } from '@/components/receivable-card';
import { useProtocol, useReceivables, money } from '@/lib/hooks';
import { fundingSummary } from '@/lib/portfolio.cjs';
export default function Market(){
  const [search,setSearch]=useState(''); const query=useReceivables();const protocol=useProtocol();
  const summary=fundingSummary(query.data?.rows??[],BigInt(Math.floor(Date.now()/1000)));
  const ready=!!query.data&&!!protocol.data&&!query.isError&&!protocol.isError;
  return <><div className="product-heading"><div><p>Capital for business receivables</p><h1>Funding market</h1><p>Review buyer-approved invoices, compare the terms and choose what to fund.</p></div><span className="environment-badge">USDG on Arbitrum Sepolia</span></div>
    <div className="product-metrics"><Metric icon={<Landmark size={20}/>} label="Open opportunities" value={ready?String(summary.count):'Unavailable'}/><Metric icon={<Coins size={20}/>} label="Requested advances" value={ready?`${money(summary.advance,protocol.data!.decimals)} USDG`:'Unavailable'}/><Metric icon={<ShieldCheck size={20}/>} label="Default coverage" value="Partial buyer bond"/></div>
    <div className="product-notice"><ShieldCheck size={20}/><p>The buyer’s bond covers part of the invoice. The remaining repayment depends on the buyer. Review their payment record and verify the invoice before funding.</p></div>
    <section><div className="list-heading"><div><h2>Available invoices</h2><p>Approved invoices with an open funding window.</p></div><input className="form-input list-search" aria-label="Search funding opportunities" placeholder="Invoice ID or wallet address" value={search} onChange={e=>setSearch(e.target.value)}/></div><InvoiceList role="market" cards search={search}/></section>
  </>;
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="product-metric"><span>{icon}</span><div><p>{label}</p><strong>{value}</strong></div></div>;}
