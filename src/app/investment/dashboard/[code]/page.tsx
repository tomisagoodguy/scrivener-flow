import { redirect } from 'next/navigation';

export default async function StockDashboardRedirect({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;
    redirect(`/investment/stock/${code}`);
}
