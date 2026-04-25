'use client';

import { useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { SignalBadge } from './SignalBadge';
import { HoldingsPriceOverlayChart } from './HoldingsPriceOverlayChart';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import {
    useStockDetailData,
    type HoldingEtf,
    type SignalRow,
    type DiffRow,
    type AumRow,
    type EquityRow,
} from '@/hooks/investment/useStockDetailData';

export interface StockDetailPanelProps {
    stockCode: string | null;
    stockName?: string;
    price?: number | null;
    changePct?: number | null;
    onClose: () => void;
}

// ── 子元件：Skeleton ──────────────────────────────────────────────────────────

function Skeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-2 animate-pulse">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
        </div>
    );
}

// ── 子元件：各區塊 ─────────────────────────────────────────────────────────────

function HoldingsBlock({ holdings }: { holdings: HoldingEtf[] }) {
    if (!holdings.length) return <p className="text-slate-400 text-xs">無持倉資料</p>;
    return (
        <ul className="space-y-1.5">
            {holdings.map(h => {
                const delta = h.prev_weight != null ? h.weight - h.prev_weight : null;
                return (
                    <li key={h.etf_code} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{h.etf_code}</span>
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{h.weight.toFixed(2)}%</span>
                            {delta != null && (
                                <span className={`text-xs ${delta > 0 ? 'text-rose-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}
                                    {Math.abs(delta).toFixed(2)}pp
                                </span>
                            )}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

function SignalsBlock({ signals }: { signals: SignalRow[] }) {
    if (!signals.length) return <p className="text-slate-400 text-xs">今日無特殊訊號</p>;
    return (
        <ul className="space-y-2">
            {signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                    <SignalBadge strength={s.strength} type={s.signal_type} />
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{s.etf_codes.join(', ')}</span>
                    </div>
                </li>
            ))}
        </ul>
    );
}

const ACTION_LABELS: Record<string, string> = {
    BUY: '加碼', IN: '建倉', SELL: '減碼', OUT: '出清', CLOSE: '出清', TRIM: '減碼',
};

function DiffsBlock({ diffs }: { diffs: DiffRow[] }) {
    if (!diffs.length) return <p className="text-slate-400 text-xs">無近期異動</p>;
    return (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {diffs.map((d, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{d.data_date}</span>
                    <span className="font-mono text-indigo-500">{d.etf_code}</span>
                    <span className={`font-medium ${d.change_type === 'BUY' || d.change_type === 'IN' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {ACTION_LABELS[d.change_type] ?? d.change_type}
                    </span>
                    <span className="text-slate-500">{d.curr_weight != null ? `${d.curr_weight.toFixed(2)}%` : '—'}</span>
                </li>
            ))}
        </ul>
    );
}

function EquityBlock({ equity }: { equity: EquityRow | null }) {
    if (!equity) return <p className="text-slate-400 text-xs">無大戶資料</p>;
    const delta = equity.big_holder_pct_change;
    return (
        <div className="flex items-center gap-4 text-sm">
            <div>
                <div className="text-slate-400 text-xs mb-0.5">大戶比例</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                    {equity.big_holder_pct != null ? `${equity.big_holder_pct.toFixed(1)}%` : '—'}
                </div>
            </div>
            {delta != null && (
                <div>
                    <div className="text-slate-400 text-xs mb-0.5">週變化</div>
                    <div className={`font-medium ${delta > 0 ? 'text-rose-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(2)}pp
                    </div>
                </div>
            )}
            <div className="text-xs text-slate-400">{equity.snapshot_date}</div>
        </div>
    );
}

function AumBlock({ aum }: { aum: AumRow[] }) {
    if (!aum.length) return <p className="text-slate-400 text-xs">無 AUM 資料</p>;
    return (
        <ul className="space-y-1.5">
            {aum.map(a => (
                <li key={a.etf_code} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-indigo-500">{a.etf_code}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{a.aum_100m.toFixed(1)} 億</span>
                    {a.inflow_share != null && (
                        <span className={`text-xs ${a.inflow_share > 0.7 ? 'text-rose-500' : a.inflow_share < 0.3 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            申購占比 {(a.inflow_share * 100).toFixed(0)}%
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );
}

const ETF_COLOR_MAP = Object.fromEntries(ETF_REGISTRY.map(e => [e.code, e.color]));

// ── 主元件 ────────────────────────────────────────────────────────────────────

export function StockDetailPanel({ stockCode, stockName, price, changePct, onClose }: StockDetailPanelProps) {
    const { data, loadingBlocks, errors } = useStockDetailData(stockCode);

    // ESC 關閉
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const isOpen = !!stockCode;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-full md:w-[480px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">{stockCode}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">{stockName}</span>
                        {price != null && (
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-800 dark:text-slate-200">{price.toFixed(2)}</span>
                                {changePct != null && (
                                    <span className={`text-xs font-medium ${changePct > 0 ? 'text-rose-500' : changePct < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                        {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {renderSection('holdings', '持倉概況', loadingBlocks, errors,
                        <HoldingsBlock holdings={data?.holdings ?? []} />
                    )}
                    {/* 比重 × 股價疊圖 */}
                    {stockCode && data?.holdings && data.holdings.length > 0 && (
                        <section>
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">比重走勢 × 股價</h3>
                            <HoldingsPriceOverlayChart
                                stockCode={stockCode}
                                etfCodes={data.holdings.map(h => h.etf_code)}
                                etfColors={ETF_COLOR_MAP}
                            />
                        </section>
                    )}
                    {renderSection('signals', '訊號', loadingBlocks, errors,
                        <SignalsBlock signals={data?.signals ?? []} />
                    )}
                    {renderSection('diffs', '近期異動', loadingBlocks, errors,
                        <DiffsBlock diffs={data?.diffs ?? []} />
                    )}
                    {renderSection('equity', '大戶籌碼', loadingBlocks, errors,
                        <EquityBlock equity={data?.equity ?? null} />
                    )}
                    {renderSection('aum', 'ETF 規模對比', loadingBlocks, errors,
                        <AumBlock aum={data?.aum ?? []} />
                    )}
                </div>
            </div>
        </>
    );
}

// ── 工具函式 ──────────────────────────────────────────────────────────────────

function renderSection(
    key: string,
    title: string,
    loading: Set<string>,
    errors: Set<string>,
    content: React.ReactNode
) {
    return (
        <section key={key}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
            {errors.has(key) ? (
                <p className="text-xs text-rose-400">載入失敗</p>
            ) : loading.has(key) ? (
                <Skeleton />
            ) : (
                content
            )}
        </section>
    );
}
