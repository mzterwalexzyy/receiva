"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FilePlus2, ClipboardCheck, Landmark, ShieldCheck, ReceiptText } from "lucide-react";
import { Wallet } from "./wallet";
import { chain } from "@/lib/chain";
const links = [["/", "Overview", LayoutDashboard], ["/supplier", "My invoices", FilePlus2], ["/buyer", "Buyer desk", ClipboardCheck], ["/market", "Funding market", Landmark], ["/lab", "Security lab", ShieldCheck]] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell"><a className="skip-link" href="#content">Skip to content</a><aside className="sidebar">
    <Link className="brand" href="/" aria-label="Receiva home"><span className="brand-icon"><ReceiptText size={23} /></span>receiva<span className="brand-dot">.</span></Link>
    <p className="nav-caption">Workspace</p><nav aria-label="Main navigation">{links.map(([href, label, Icon]) => <Link key={href} href={href} className={pathname === href ? "nav-link active" : "nav-link"}><Icon size={19} strokeWidth={1.6} />{label}</Link>)}</nav>
    <div className="sidebar-bottom"><div className="network-card"><span className="network-dot" /><span>{chain.name}<small>Testnet workspace</small></span></div><p>Working capital.<br />On your terms.</p></div>
  </aside><div className="main-shell"><header className="topbar"><span>Invoice financing <span className="topbar-divider">/</span> {links.find(([href]) => href === pathname)?.[1] || "Receivable"}</span><Wallet /></header><main id="content">{children}</main><footer>Receiva · Arbitrum Open House <span>Test assets only. Returns depend on buyer repayment.</span></footer></div></div>;
}
