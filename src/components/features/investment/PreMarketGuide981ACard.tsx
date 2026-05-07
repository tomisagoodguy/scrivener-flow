'use client';

import Link from 'next/link';

// ── 型別 ──────────────────────────────────────────────────────────────────────

export interface DiffEntry981A {
    stock_code: string;
    stock_name: string;
    change_type: 'IN' | 'OUT' | 'BUY' | 'SELL' | 'CLOSE';
    diff_shares: number;
    diff_weight: number;
    curr_weight: number | null;
    is_significant: boolean | null;
    shares_張: number;
    amount_亿: number | null;
}

export interface Guide981AData {
    displayDate: string;
    buys: DiffEntry981A[];
    newIn: DiffEntry981A[];
    sells: DiffEntry981A[];
    exits: DiffEntry981A[];
}

// ── 工具 ──────────────────────────────────────────────────────────────────────

function fmtAmount(e: DiffEntry981A, positive: boolean): string {
    const sign = positive ? '+' : '-';
    if (e.amount_亿 != null) {
        if (e.amount_亿 >= 1) return `${sign}${e.amount_亿.toFixed(2)} 億`;
        return `${sign}${(e.amount_亿 * 1000).toFixed(0)} 萬`;
    }
    return `${sign}${e.shares_張.toLocaleString()} 張`;
}

// ── 橫條圖比例 ────────────────────────────────────────────────────────────────

function BarRow({
    e,
    maxVal,
    isInflow,
    badge,
    rank,
    label,
    stockList,
}: {
    e: DiffEntry981A;
    maxVal: number;
    isInflow: boolean;
    badge?: React.ReactNode;
    rank: number;
    label: string;
    stockList: string;
}) {
    const val = e.amount_亿 ?? e.shares_張 / 1000;
    const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
    const barColor = isInflow ? 'bg-amber-500' : 'bg-emerald-500';
    const amtColor = isInflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    const href = `/investment/stock/${e.stock_code}?from=${encodeURIComponent(label)}&rank=${rank}&list=${stockList}`;

    return (
        <div className="py-1.5">
            <div className="flex items-center gap-2 mb-0.5">
                <Link href={href} className="font-mono text-xs text-indigo-500 dark:text-indigo-400 w-11 shrink-0 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">{e.stock_code}</Link>
                <span className="text-sm text-slate-700 dark:text-slate-300 w-20 shrink-0 truncate">{e.stock_name}</span>
                <span className={`text-sm font-semibold tabular-nums ${amtColor}`}>
                    {fmtAmount(e, isInflow)}
                </span>
                {badge}
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    {isInflow ? '+' : '-'}{e.shares_張.toLocaleString()} 張
                    {e.diff_weight !== 0 && (
                        <span className="ml-1">{isInflow ? '+' : ''}{e.diff_weight.toFixed(2)}pp</span>
                    )}
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                <div
                    className={`h-full rounded-full ${barColor} opacity-70`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
    title,
    entries,
    isInflow,
    badge,
    label,
}: {
    title: string;
    entries: DiffEntry981A[];
    isInflow: boolean;
    badge?: (e: DiffEntry981A) => React.ReactNode;
    label: string;
}) {
    if (entries.length === 0) return null;
    const maxVal = Math.max(...entries.map(e => e.amount_亿 ?? e.shares_張 / 1000));
    const titleColor = isInflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    const stockList = entries.map(e => e.stock_code).join(',');

    return (
        <div>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5 ${titleColor}`}>
                {title}
                <span className="font-normal text-slate-400 dark:text-slate-500 normal-case tracking-normal">{entries.length}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {entries.map((e, i) => (
                    <BarRow
                        key={e.stock_code}
                        e={e}
                        maxVal={maxVal}
                        isInflow={isInflow}
                        badge={badge?.(e)}
                        rank={i + 1}
                        label={label}
                        stockList={stockList}
                    />
                ))}
            </div>
        </div>
    );
}

// ── 主 Card ───────────────────────────────────────────────────────────────────

export function PreMarketGuide981ACard({ data }: { data: Guide981AData }) {
    const totalBuySide = data.buys.length + data.newIn.length;
    const totalSellSide = data.sells.length + data.exits.length;

    return (
        <div className="glass-card rounded-xl overflow-hidden border-l-2 border-amber-400">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">00981A</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">瑤姐</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">· {data.displayDate} 加減碼</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    <span>加 {totalBuySide}</span>
                    <span>減 {totalSellSide}</span>
                </div>
            </div>

            {/* Body：2 欄 */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700/50">
                {/* 左：加碼 + 新建倉 */}
                <div className="px-4 py-3 space-y-4">
                    <Section title="加碼" entries={data.buys} isInflow label="瑤姐加碼" />
                    <Section
                        title="新建倉"
                        entries={data.newIn}
                        isInflow
                        label="瑤姐新建倉"
                        badge={() => (
                            <span className="px-1 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold leading-tight">
                                NEW
                            </span>
                        )}
                    />
                </div>

                {/* 右：減碼 + 出清 */}
                <div className="px-4 py-3 space-y-4">
                    <Section title="減碼" entries={data.sells} isInflow={false} label="瑤姐減碼" />
                    <Section
                        title="出清"
                        entries={data.exits}
                        isInflow={false}
                        label="瑤姐出清"
                        badge={() => (
                            <span className="px-1 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold leading-tight">
                                OUT
                            </span>
                        )}
                    />
                    {totalSellSide === 0 && (
                        <p className="text-sm text-slate-400 dark:text-slate-500">無減碼</p>
                    )}
                </div>
            </div>
        </div>
    );
}
