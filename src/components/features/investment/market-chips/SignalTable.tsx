import React from 'react';
import Link from 'next/link';
import type { InstitutionalSignal, SignalType } from '@/app/actions/getMarketChips';

interface SignalTableProps {
    signals: InstitutionalSignal[];
    signalType: SignalType;
}

const EMPTY_LABEL: Record<SignalType, string> = {
    dual_buy: '今日尚無雙法人同買訊號',
    consecutive_buy: '今日尚無法人連買訊號',
    divergence: '今日尚無土洋分歧訊號',
};

function toLots(shares: number): string {
    const lots = shares / 1000;
    return `${lots > 0 ? '+' : ''}${lots.toFixed(0)} 張`;
}

function netClass(value: number): string {
    if (value > 0) return 'text-rose-600 dark:text-rose-400';
    if (value < 0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-slate-500 dark:text-slate-400';
}

export function SignalTable({ signals, signalType }: SignalTableProps) {
    if (signals.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                {EMPTY_LABEL[signalType]}
            </div>
        );
    }

    const cols = signalType === 'consecutive_buy' ? 5 : 4;

    return (
        <div className="overflow-x-auto">
            <div
                className="grid text-sm min-w-[520px]"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
                <div className="col-span-full grid grid-cols-subgrid text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-1">
                    <span>股票代號</span>
                    <span>外資淨額</span>
                    <span>投信淨額</span>
                    {signalType === 'consecutive_buy' && <span>連買天數</span>}
                    <span>ETF 同步</span>
                </div>
                {signals.map((s) => (
                    <Link
                        key={s.stock_code}
                        href={`/investment/stock/${s.stock_code}`}
                        className="col-span-full grid grid-cols-subgrid items-center py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded"
                    >
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">{s.stock_code}</span>
                        <span className={`font-mono ${netClass(s.metadata.foreign_net)}`}>
                            {toLots(s.metadata.foreign_net)}
                        </span>
                        <span className={`font-mono ${netClass(s.metadata.trust_net)}`}>
                            {toLots(s.metadata.trust_net)}
                        </span>
                        {signalType === 'consecutive_buy' && (
                            <span className="text-slate-700 dark:text-slate-300">
                                {s.metadata.consecutive_days ?? '—'}
                            </span>
                        )}
                        <span>
                            {s.etf_cross ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                    ETF 同步加碼
                                </span>
                            ) : (
                                <span className="text-slate-400">—</span>
                            )}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
