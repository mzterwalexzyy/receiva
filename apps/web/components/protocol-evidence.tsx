"use client";
import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import Link from 'next/link';
import { chain, hubAddress, explorer } from '@/lib/chain';
import { hubAbi } from '@/lib/abi';
import { useProtocol, money, useReceivables } from '@/lib/hooks';
export function ProtocolEvidence(){
 const client=usePublicClient();const protocol=useProtocol();const invoices=useReceivables();
 const query=useQuery({queryKey:['evidence',chain.id,hubAddress],enabled:!!client&&!!hubAddress,refetchInterval:30000,queryFn:async()=>{
   const [block,code,bonds]=await Promise.all([client!.getBlock(),client!.getCode({address:hubAddress!}),client!.readContract({address:hubAddress!,abi:hubAbi,functionName:'totalActiveBonds'})]);
   return {block:block.number.toString(),timestamp:new Date(Number(block.timestamp)*1000).toISOString(),hasCode:!!code&&code!=='0x',bonds};
 }});
 return <><div className="product-heading"><div><p>Check the underlying records</p><h1>Protocol evidence</h1><p>Contract reads and explorer links from the configured network.</p></div><button className="button secondary" disabled={query.isFetching} onClick={()=>{void query.refetch();void protocol.refetch();void invoices.refetch();}}>{query.isFetching?'Checking…':'Refresh records'}</button></div>
 <div className="product-notice"><p>This deployment uses test assets on {chain.name}. Transaction records demonstrate contract activity, not customer adoption, revenue or an independent security audit.</p></div>
 {(query.isError||protocol.isError)&&<p role="alert" className="alert-box alert-error">Unable to read current protocol data. Refresh to retry.</p>}
 <div className="evidence-grid"><section className="panel"><h2>Deployment</h2><div className="evidence-row"><span>Network</span><strong>{chain.name} · {chain.id}</strong></div><div className="evidence-row"><span>Contract address</span>{hubAddress&&explorer?<a target="_blank" rel="noreferrer" href={`${explorer}/address/${hubAddress}`}>{hubAddress}</a>:<strong>Not configured</strong>}</div><div className="evidence-row"><span>Contract bytecode</span><strong>{query.data?query.data.hasCode?'Present at this address':'No bytecode found':query.isError?'Unavailable':'Reading network…'}</strong></div><div className="evidence-row"><span>Settlement token</span>{protocol.data&&explorer?<a href={`${explorer}/token/${protocol.data.token}`} target="_blank" rel="noreferrer">{protocol.data.symbol} · {protocol.data.token}</a>:<strong>Unavailable</strong>}</div><div className="evidence-row"><span>Source and audit status</span><p>Explorer source verification must be checked separately. No independent audit is claimed.</p>{hubAddress&&explorer&&<a target="_blank" rel="noreferrer" href={`${explorer}/address/${hubAddress}#code`}>Inspect contract source on Arbiscan</a>}</div></section>
 <section className="panel"><h2>Current contract state</h2><div className="evidence-row"><span>Latest observed block</span><strong>{query.data?.block??'Unavailable'}</strong><time>{query.data?.timestamp}</time></div><div className="evidence-row"><span>Registered invoices</span><strong>{invoices.data?.count.toString()??'Unavailable'}</strong></div><div className="evidence-row"><span>Active buyer bonds</span><strong>{query.data&&protocol.data?`${money(query.data.bonds,protocol.data.decimals)} ${protocol.data.symbol}`:'Unavailable'}</strong></div><div className="evidence-row"><span>Receipts by invoice</span>{invoices.data?.rows.slice(0,8).map(r=><Link key={r.id.toString()} href={`/receivables/${r.id}`}>Invoice #{r.id.toString()} · View terms and transaction history</Link>)}</div></section></div></>;
}
