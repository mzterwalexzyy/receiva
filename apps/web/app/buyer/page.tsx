"use client";
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { useHistory } from '@/lib/hooks';
import { InvoiceList } from '@/components/receivable-card';
import { repaymentRecord } from '@/lib/portfolio.cjs';
export default function Buyer(){
 const {address}=useAccount(); const history=useHistory(address); const [status,setStatus]=useState('all');
 const record=history.data?repaymentRecord(history.data.onTime,history.data.late,history.data.defaults):null;
 const items=[['On-time payments',history.data?.onTime.toString()],['Late payments',history.data?.late.toString()],['Unresolved defaults',record?.unresolvedDefaults.toString()],['On-time share',record?.onTimeRate==null?'No payment history':`${record.onTimeRate}%`]];
 return <><div className="product-heading"><div><p>Your payment workspace</p><h1>Buyer payments</h1><p>Review invoices, post a buyer bond and manage repayments from one place.</p></div></div><div className="product-metrics buyer-metrics">{items.map(([label,value])=><div className="product-metric" key={label}><div><p>{label}</p><strong>{!address?'Connect wallet':history.isError?'Unavailable':history.isPending?'Loading…':value}</strong></div></div>)}</div><div className="product-notice"><p>Payment history belongs to this wallet. It doesn’t verify a business identity or guarantee future repayment.</p></div><div className="list-heading"><div><h2>Invoices assigned to you</h2><p>Only invoices naming your connected wallet as buyer.</p></div><select className="form-input list-search" aria-label="Filter buyer invoices" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="0">Needs approval</option><option value="1">Awaiting funding</option><option value="2">Payment due</option><option value="4">Defaulted</option><option value="3">Settled</option><option value="5">Settled late</option></select></div><InvoiceList role="buyer" status={status}/></>;
}
