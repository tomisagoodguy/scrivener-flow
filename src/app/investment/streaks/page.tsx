import { getStreaks } from '@/app/actions/getStreaks';
import { getEtfMeta } from '@/lib/investment/etfRegistry';
import type { StreakRow } from '@/lib/investment/streakUtils';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

export const revalidate = 3600;

const toLots = (shares: number): string => {
    const lots = Math.round(shares / 1000);
    const sign = lots > 0 ? '+' : '';
    return `${sign}${lots.toLocaleString('en-US')}`;
};

const shortDate = (d: string): string => (d ? d.slice(5) : '');

function StreakRowItem({ row }: { row: StreakRow }) {
    const isBuy = row.direction === 'buy';
    const valueColor = isBuy ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    const meta = getEtfMeta(row.etf_code);
    const streakLabel = row.is_sparse_source ? `連 ${row.streak_days} 個回報日` : `連 ${row.streak_days} 日`;

    return (
        <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{row.stock_code}</span>
                    {row.stock_name && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.stock_name}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: (meta?.color ?? '#888') + '20', color: meta?.color ?? '#888' }}
                    >
                        {meta?.shortCode ?? row.etf_code}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {shortDate(row.start_date)} → {shortDate(row.end_date)}
                    </span>
                </div>
            </div>

            <div className="text-right shrink-0">
                <div className={`font-black text-sm ${valueColor}`}>{streakLabel}</div>
                <div className={`text-xs font-semibold ${valueColor}`}>{toLots(row.net_shares)} 張</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    均 {toLots(row.avg_shares_per_day)} 張/回報日
                </div>
            </div>
        </div>
    );
}

function StreakSection({
    title,
    subtitle,
    rows,
    direction,
}: {
    title: string;
    subtitle: string;
    rows: StreakRow[];
    direction: 'buy' | 'sell';
}) {
    const isBuy = direction === 'buy';
    const accent = isBuy ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    const accentBg = isBuy ? 'bg-rose-500/10' : 'bg-emerald-500/10';
    const Icon = isBuy ? TrendingUpIcon : TrendingDownIcon;

    return (
        <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accentBg} ${accent}`}>
                    <Icon size={16} />
                </div>
                <div>
                    <h2 className="font-bold text-slate-900 dark:text-white leading-tight">{title}</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">目前無進行中</p>
            ) : (
                <div>
                    {rows.map((row) => (
                        <StreakRowItem key={`${row.etf_code}-${row.stock_code}`} row={row} />
                    ))}
                </div>
            )}
        </section>
    );
}

export default async function StreaksPage() {
    const { stockBuy, stockSell, etfBuy, etfSell, asOfDate } = await getStreaks();
    const isEmpty =
        stockBuy.length === 0 && stockSell.length === 0 && etfBuy.length === 0 && etfSell.length === 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">連續加減碼</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        以 ETF 回報日為軸,個股被主動 ETF 連續同向加減碼的進行中榜單(連紅=買、連綠=賣)
                    </p>
                </div>
                {asOfDate && (
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        資料日期: {asOfDate}
                    </div>
                )}
            </div>

            {isEmpty ? (
                <div className="glass-card rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-lg">目前無進行中的連續加減碼</p>
                    <p className="text-sm mt-2">系統每日 22:00 自動更新異動資料</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <StreakSection
                        title="個股被連買"
                        subtitle="跨 ETF 取最長進行中連續加碼"
                        rows={stockBuy}
                        direction="buy"
                    />
                    <StreakSection
                        title="個股被連賣"
                        subtitle="跨 ETF 取最長進行中連續減碼"
                        rows={stockSell}
                        direction="sell"
                    />
                    <StreakSection
                        title="ETF 連買的個股"
                        subtitle="各 ETF 進行中連續加碼,依天數排序"
                        rows={etfBuy}
                        direction="buy"
                    />
                    <StreakSection
                        title="ETF 連賣的個股"
                        subtitle="各 ETF 進行中連續減碼,依天數排序"
                        rows={etfSell}
                        direction="sell"
                    />
                </div>
            )}
        </div>
    );
}
