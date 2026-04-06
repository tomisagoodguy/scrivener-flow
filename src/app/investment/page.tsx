import { redirect } from 'next/navigation';

export default async function InvestmentPage({
    searchParams,
}: {
    searchParams: Promise<{ etf?: string; tab?: string }>;
}) {
    const params = await searchParams;

    // 舊 ?etf= query string 相容：重導向到新 segment 路由
    const supportedEtfs = ['00980A', '00981A', '00991A'];
    if (params.etf && supportedEtfs.includes(params.etf)) {
        const tabSuffix = params.tab ? `?tab=${params.tab}` : '';
        redirect(`/investment/${params.etf}${tabSuffix}`);
    }

    redirect('/investment/00981A');
}
