'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, ActivityIcon, ExternalLinkIcon } from 'lucide-react';

export interface EtfStatus {
    etf_code: string;
    name: string;
    color: string;
    dataSource: string;
    latest_date: string | null;
    staleDays: number;
}

export type OverallLevel = 'ok' | 'warn' | 'error' | 'unknown';

interface PipelineMonitorClientProps {
    statuses: EtfStatus[];
    overallLevel: OverallLevel;
    overallLabel: string;
    badgeColor: string;
    dotColor: string;
}

function getSourceUrl(etf_code: string, dataSource: string): string {
    if (dataSource === 'fhtrust') return 'https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW';
    return `https://www.pocket.tw/etf/tw/${etf_code}/fundholding`;
}

function getStatusLevel(staleDays: number): 'ok' | 'warn' | 'error' | 'unknown' {
    if (staleDays < 0) return 'unknown';
    if (staleDays <= 1) return 'ok';
    if (staleDays <= 3) return 'warn';
    return 'error';
}

function StatusIcon({ level }: { level: ReturnType<typeof getStatusLevel> }) {
    if (level === 'ok') return <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    if (level === 'warn') return <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    if (level === 'error') return <XCircleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    return <span className="w-3.5 h-3.5 rounded-full bg-slate-300 shrink-0 inline-block" />;
}

export function PipelineMonitorClient({ statuses, overallLevel, overallLabel, badgeColor, dotColor }: PipelineMonitorClientProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border cursor-pointer select-none transition-colors ${badgeColor}`}
                title="查看各 ETF 爬蟲狀態"
            >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${overallLevel === 'ok' ? 'animate-pulse' : ''}`} />
                <ActivityIcon className="w-3.5 h-3.5" />
                {overallLabel}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 z-50 w-80 glass-card rounded-2xl border border-white/50 shadow-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                            ETF Pipeline 狀態
                        </span>
                        <span className="text-xs text-slate-400">每日 22:00 自動更新</span>
                    </div>

                    <div className="space-y-1.5">
                        {statuses.map(s => {
                            const level = getStatusLevel(s.staleDays);
                            const dateLabel = s.latest_date
                                ? s.latest_date.slice(5).replace('-', '/')
                                : '—';
                            const staleLabel =
                                s.staleDays < 0 ? '無資料' :
                                s.staleDays === 0 ? '今日' :
                                s.staleDays === 1 ? '1交易日' :
                                `${s.staleDays} 交易日`;
                            const sourceUrl = getSourceUrl(s.etf_code, s.dataSource);
                            return (
                                <div key={s.etf_code} className="flex items-center gap-2 py-1">
                                    <StatusIcon level={level} />
                                    <span className="w-1.5 h-4 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                                    <a
                                        href={sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 min-w-0"
                                    >
                                        <span className="truncate">{s.etf_code.replace('A', '')} {s.name.replace('主動', '')}</span>
                                        <ExternalLinkIcon className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                    </a>
                                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{dateLabel}</span>
                                    <span className={`text-xs font-medium whitespace-nowrap ${
                                        level === 'ok' ? 'text-emerald-600 dark:text-emerald-400' :
                                        level === 'warn' ? 'text-amber-600 dark:text-amber-400' :
                                        level === 'error' ? 'text-red-600 dark:text-red-400' :
                                        'text-slate-400'
                                    }`}>
                                        {staleLabel}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><CheckCircle2Icon className="w-3 h-3 text-emerald-500" /> 正常 (≤1天)</span>
                            <span className="flex items-center gap-1"><AlertTriangleIcon className="w-3 h-3 text-amber-500" /> 延遲 (2-3天)</span>
                            <span className="flex items-center gap-1"><XCircleIcon className="w-3 h-3 text-red-500" /> 異常 (4天+)</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
