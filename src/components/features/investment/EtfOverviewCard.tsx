import React from 'react';
import Link from 'next/link';
import { EtfOverviewStat } from '@/lib/investment/etfOverviewStats';

export interface EtfOverviewCardProps {
    stat: EtfOverviewStat;
    /** 揭露日落後全部 ETF 中的最新日期 */
    isStale: boolean;
}

const BADGE_ROSE = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
const BADGE_EMERALD = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
const BADGE_NEUTRAL = 'bg-slate-500/10 text-slate-400 dark:text-slate-500 border-slate-500/20';

function DiffBadge({ label, count, tone }: { label: string; count: number; tone: 'rose' | 'emerald' }) {
    const colorClass = count === 0 ? BADGE_NEUTRAL : tone === 'rose' ? BADGE_ROSE : BADGE_EMERALD;
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
            {label} {count}
        </span>
    );
}

function formatValue(value: number | null, fractionDigits: number): string {
    if (value === null) return '—';
    return value.toLocaleString('zh-TW', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
}

export function EtfOverviewCard({ stat, isStale }: EtfOverviewCardProps) {
    return (
        <Link
            href={`/investment/${stat.code}`}
            className="glass-card rounded-2xl p-5 block transition-all hover:scale-[1.02] hover:shadow-lg"
        >
            {/* 標題列 */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold" style={{ color: stat.color }}>
                            {stat.code}
                        </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                        {stat.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.manager}</p>
                </div>
                <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        isStale
                            ? 'bg-slate-500/10 text-slate-400 dark:text-slate-500'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                >
                    {stat.dataDate ?? '無資料'}
                </span>
            </div>

            {/* 指標列 */}
            <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">NAV</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatValue(stat.nav, 2)}
                    </dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">基金規模</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                        {stat.aum100m === null ? '—' : `${formatValue(stat.aum100m, 2)} 億`}
                    </dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">持股檔數</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                        {stat.holdingsCount}
                    </dd>
                </div>
            </dl>

            {/* 異動 badges：台股慣例 紅=新增/加碼、綠=刪除/減碼 */}
            <div className="flex flex-wrap gap-1.5 mt-4">
                <DiffBadge label="新增" count={stat.added} tone="rose" />
                <DiffBadge label="刪除" count={stat.removed} tone="emerald" />
                <DiffBadge label="加碼" count={stat.increased} tone="rose" />
                <DiffBadge label="減碼" count={stat.decreased} tone="emerald" />
            </div>
        </Link>
    );
}
