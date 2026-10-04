import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";
import "./reference.css";
import "./workspace.css";
export const metadata: Metadata = { title: "Receiva | Invoice financing", description: "Turn buyer-approved invoices into working capital on Arbitrum.", icons: { icon: '/receiva-mark.png', apple: '/receiva-mark.png' } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><Providers><Shell>{children}</Shell></Providers></body></html>; }
