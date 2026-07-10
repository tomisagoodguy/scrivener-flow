export const revalidate = 3600;

import { getMarketChips } from '@/app/actions/getMarketChips';
import { FuturesPositionChart } from '@/components/features/investment/market-chips/FuturesPositionChart';
import { RetailRatioChart } from '@/components/features/investment/market-chips/RetailRatioChart';
import { MarginBalanceChart } from '@/components/features/investment/market-chips/MarginBalanceChart';
import { SignalTabs } from '@/components/features/investment/market-chips/SignalTabs';

export const metadata = { title: '市場籌碼 | 投資監控' };

function latestDate(dates: string[]): string {
    if (dates.length === 0) return 'N/A';
    return dates[dates.length - 1];
}

export default async function MarketChipsPage() {
    const { futuresPositions, retailRatios, marginBalances, signals } = await getMarketChips();

    const futuresDate = latestDate(futuresPositions.map((p) => p.data_date));
    const retailDate = latestDate(retailRatios.map((p) => p.data_date));
    const marginDate = latestDate(marginBalances.map((p) => p.data_date));
    const signalDate = signals[0]?.data_date ?? 'N/A';

    return (
        <div className="container mx-auto py-8 space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">市場籌碼</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    台指期三大法人部位、散戶多空比、融資融券餘額與當日法人訊號
                </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">台指期三大法人淨部位走勢</h2>
                    <span className="text-xs text-slate-400">資料日期：{futuresDate}</span>
                </div>
                <FuturesPositionChart data={futuresPositions} />
            </div>

            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">小台/微台散戶多空比走勢</h2>
                    <span className="text-xs text-slate-400">資料日期：{retailDate}</span>
                </div>
                <RetailRatioChart data={retailRatios} />
            </div>

            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">融資融券餘額走勢</h2>
                    <span className="text-xs text-slate-400">資料日期：{marginDate}</span>
                </div>
                <MarginBalanceChart data={marginBalances} />
            </div>

            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">當日法人訊號清單</h2>
                    <span className="text-xs text-slate-400">資料日期：{signalDate}</span>
                </div>
                <SignalTabs signals={signals} />
            </div>
        </div>
    );
}
