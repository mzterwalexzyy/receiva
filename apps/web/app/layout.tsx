import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = { title: "Receiva | Invoice financing", description: "Turn buyer-approved invoices into working capital on Arbitrum." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><Providers><Shell>{children}</Shell></Providers></body></html>; }
