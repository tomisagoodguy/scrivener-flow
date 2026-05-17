'use client';

import { useState } from 'react';
import type { FactorICRow } from '@/app/actions/getFactorIC';
import FactorICSparkline from './FactorICSparkline';

interface Props {
    data: FactorICRow[];
}

const PROXY_FACTORS = [
    { key: 'sector_ret_1d',    label: '日報酬' },
    { key: 'sector_ret_5d',    label: '週報酬' },
    { key: 'vol_ratio_20d',    label: '量比20d' },
    { key: 'above_ma20_pct',   label: 'MA20勝率' },
];

function icColor(ic: number | null): string {
    if (ic === null) return 'text-gray-400';
    if (ic >= 0.04) return 'text-emerald-600 dark:text-emerald-400';
    if (ic >= 0.02) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-rose-600 dark:text-rose-400';
}

function fmtIC(v: number | null): string {
    if (v === null) return '—';
    return v.toFixed(3);
}

export default function FactorICPanel({ data }: Props) {
    const [open, setOpen] = useState(false);

    if (data.length === 0) return null;

    return (
        <div className="glass-card rounded-xl mb-4 overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 transition-colors text-left"
            >
                <div>
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                        篩選條件效力（IC）
                    </span>
                    <span className="ml-2 text-xs text-gray-400">代理因子</span>
                </div>
                <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="border-t border-white/30 px-4 py-3 space-y-3">
                    {PROXY_FACTORS.map(({ key, label }) => {
                        const rows = data
                            .filter((r) => r.factor === key)
                            .sort((a, b) => b.month.localeCompare(a.month));
                        const latest = rows[0] ?? null;
                        const sparkData = [...rows].reverse().map((r) => ({
                            month: r.month,
                            ic_20d: r.ic_20d,
                        }));

                        return (
                            <div key={key} className="flex items-center gap-4">
                                <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                    <span className={icColor(latest?.ic_1d ?? null)}>
                                        1d {fmtIC(latest?.ic_1d ?? null)}
                                    </span>
                                    <span className={icColor(latest?.ic_5d ?? null)}>
                                        5d {fmtIC(latest?.ic_5d ?? null)}
                                    </span>
                                    <span className={icColor(latest?.ic_20d ?? null)}>
                                        20d {fmtIC(latest?.ic_20d ?? null)}
                                    </span>
                                </div>
                                <div className="ml-auto">
                                    <FactorICSparkline data={sparkData} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
