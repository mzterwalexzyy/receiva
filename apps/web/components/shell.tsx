"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FilePlus2, ClipboardCheck, Landmark, ShieldCheck, ReceiptText, Search, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Wallet } from './wallet';
import { Brand } from './brand';
import { chain, hubAddress, explorer, short } from '@/lib/chain';
const navigation = [
  {href:'/dashboard',label:'Overview',icon:LayoutDashboard},
  {href:'/market',label:'Funding market',icon:Landmark},
  {href:'/supplier',label:'Supplier invoices',icon:FilePlus2},
  {href:'/buyer',label:'Buyer payments',icon:ClipboardCheck},
];
export function Shell({children}:{children:React.ReactNode}) {
  const pathname=usePathname(); const router=useRouter(); const [search,setSearch]=useState('');
  if(pathname==='/') return <main id="content">{children}</main>;
  const title=navigation.find(item=>item.href===pathname)?.label ?? (pathname==='/lab'?'Protocol evidence':'Invoice details');
  return <div className="app-shell rv-workspace"><a className="skip-link" href="#content">Skip to content</a>
    <aside className="sidebar"><Link className="sidebar-logo" href="/dashboard" aria-label="Receiva overview"><Brand/></Link>
      <div className="sidebar-label">Workspace</div><nav className="sidebar-nav" aria-label="Workspace">{navigation.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={pathname===href?'page':undefined} className={`sidebar-link ${pathname===href?'active':''}`}><Icon size={18}/><span>{label}</span></Link>)}</nav>
      <div className="workspace-support"><Link className={`sidebar-link ${pathname==='/lab'?'active':''}`} href="/lab"><ShieldCheck size={18}/>Protocol evidence</Link><div className="network-card"><span className="network-label">Test environment</span><strong>{chain.name}</strong><small>Test assets only</small>{hubAddress && explorer && <a href={`${explorer}/address/${hubAddress}`} target="_blank" rel="noreferrer">{short(hubAddress)} <ExternalLink size={12}/></a>}</div></div>
    </aside><div className="main-shell"><header className="topbar"><div className="topbar-context"><span>{title}</span><form className="topbar-search" role="search" onSubmit={e=>{e.preventDefault();if(/^\d+$/.test(search.trim()))router.push(`/receivables/${search.trim()}`);}}><Search size={15}/><input aria-label="Find invoice by ID" inputMode="numeric" pattern="[0-9]+" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find invoice by ID" required/><button type="submit" aria-label="Find invoice"><ArrowIcon/></button></form></div><Wallet/></header><main id="content" className="main-content">{children}</main><footer className="workspace-footer"><span>Receiva · Invoice financing</span><span>{chain.name} · Test assets only</span></footer></div>
  </div>;
}
function ArrowIcon(){return <Search size={15}/>;}
