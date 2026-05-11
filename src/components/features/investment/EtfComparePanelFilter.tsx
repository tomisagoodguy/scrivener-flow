'use client';

import { useState } from 'react';
import { getOverlapColor, truncateList } from './EtfComparePanelUtils';
import type { EtfData, OverlapData } from './EtfComparePanel';

const SECTOR_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
    '#8b5cf6', '#14b8a6', '#f97316', '#84cc16',
];

interface HoldingItem { stock_code: string; stock_name: string; weight: number; rank: number; in_etfs: string[] }
interface SectorItem { sector_name: string; weight: number }

function SectorBar({ sectors }: { sectors: SectorItem[] }) {
    if (!sectors.length) return <div className="h-6 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-400 flex items-center justify-center">無產業資料</div>;
    const top8 = sectors.slice(0, 8);
    const otherWeight = Math.max(0, 100 - top8.reduce((s, x) => s + x.weight, 0));
    return (
        <div className="mt-3">
            <div className="flex h-5 rounded overflow-hidden w-full">
                {top8.map((s, i) => <div key={s.sector_name} title={`${s.sector_name}: ${s.weight.toFixed(1)}%`} style={{ width: `${s.weight}%`, backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />)}
                {otherWeight > 1 && <div title={`其他: ${otherWeight.toFixed(1)}%`} style={{ width: `${otherWeight}%`, backgroundColor: '#94a3b8' }} />}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {top8.map((s, i) => (
                    <div key={s.sector_name} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                        {s.sector_name} {s.weight.toFixed(1)}%
                    </div>
                ))}
            </div>
        </div>
    );
}

export function EtfCard({ etf, overlapMap, totalEtfs }: { etf: EtfData; overlapMap: Map<string, number>; totalEtfs: number }) {
    const [expanded, setExpanded] = useState(false);
    const topWeight = (etf.holdings as HoldingItem[]).slice(0, 10).reduce((s, h) => s + h.weight, 0);
    const displayed = expanded ? etf.holdings : etf.holdings.slice(0, 10);
    return (
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 text-white" style={{ backgroundColor: etf.color }}>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-lg font-bold">{etf.etf_code}</div>
                        <div className="text-sm opacity-90">{etf.name}</div>
                        <div className="text-xs opacity-75 mt-0.5">{etf.manager}</div>
                    </div>
                    <div className="text-right">
                        {etf.aum_100m_twd !== null && <div className="text-sm font-medium">規模 {etf.aum_100m_twd.toFixed(1)} 億</div>}
                        <div className="text-xs opacity-75 mt-1">前10大合計權重 {topWeight.toFixed(2)}%</div>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                            <th className="px-3 py-2 text-left w-7">#</th>
                            <th className="px-3 py-2 text-left">代號</th>
                            <th className="px-3 py-2 text-left">名稱</th>
                            <th className="px-3 py-2 text-right">比重</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(displayed as HoldingItem[]).map(h => {
                            const n = overlapMap.get(h.stock_code) ?? 1;
                            const color = n >= 2 ? getOverlapColor(n, totalEtfs) : null;
                            return (
                                <tr key={h.stock_code} className={['border-t border-slate-100 dark:border-slate-700/50 hover:opacity-90 transition-colors', color ? `${color.bg} ${color.dark}` : ''].join(' ')}>
                                    <td className="px-3 py-2 text-slate-400 text-xs">{h.rank}</td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                        <a href={`https://finance.yahoo.com/quote/${h.stock_code}.TW`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{h.stock_code}</a>
                                    </td>
                                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                                        {h.stock_name}
                                        {color && <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${color.badge} ${color.badgeDark}`}>{n}共</span>}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">{h.weight.toFixed(2)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {etf.holdings.length > 10 && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/50">
                    <button onClick={() => setExpanded(!expanded)} className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1">
                        {expanded ? '收合 ▲' : `顯示全部 ${etf.holdings.length} 筆 ▼`}
                    </button>
                </div>
            )}
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">產業分布</div>
                <SectorBar sectors={etf.sectors as SectorItem[]} />
            </div>
        </div>
    );
}

export function OverlapSummary({ byCount, totalEtfs, totalUnique }: { byCount: OverlapData['byCount']; totalEtfs: number; totalUnique: number }) {
    const levels = Object.keys(byCount).map(Number).sort((a, b) => b - a);
    if (levels.length === 0) {
        return (
            <div className="glass-card rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />持股無重疊
            </div>
        );
    }
    return (
        <div className="glass-card rounded-xl px-4 py-3 flex flex-wrap gap-4 text-sm">
            {levels.map(n => {
                const codes = byCount[n];
                const pct = totalUnique > 0 ? ((codes.length / totalUnique) * 100).toFixed(0) : '0';
                const color = getOverlapColor(n, totalEtfs);
                return (
                    <div key={n} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-sm ${color.dot} shrink-0`} />
                        <span className="text-slate-700 dark:text-slate-200">
                            {n === totalEtfs ? `全 ${n} 支共同持有` : `${n} 支共同持有`}
                            <span className={`font-bold mx-1 ${n === totalEtfs ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>{codes.length}</span>支
                            <span className="text-slate-400 dark:text-slate-500 ml-1">（佔全部持股 {pct}%）</span>
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function OverlapLegend({ byCount, totalEtfs }: { byCount: OverlapData['byCount']; totalEtfs: number }) {
    const levels = Object.keys(byCount).map(Number).sort((a, b) => b - a);
    if (levels.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-3 text-sm">
            {levels.map(n => {
                const { shown, remaining } = truncateList(byCount[n], 5);
                const color = getOverlapColor(n, totalEtfs);
                return (
                    <div key={n} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${n === totalEtfs ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50'}`}>
                        <span className={`w-3 h-3 rounded-sm ${color.dot} shrink-0`} />
                        <span className={n === totalEtfs ? 'text-yellow-800 dark:text-yellow-300' : 'text-blue-800 dark:text-blue-300'}>
                            {n === totalEtfs ? `全 ${n} 支共同持有` : `${n} 支共同持有`}：{shown.join('、')}{remaining > 0 && <span className="ml-1 opacity-75">+{remaining} 支</span>}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
