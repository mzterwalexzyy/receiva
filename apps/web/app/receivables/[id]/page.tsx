import { ReceivableDetail } from "@/components/receivable-detail";
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ReceivableDetail id={id} />; }
