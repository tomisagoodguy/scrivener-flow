'use client';

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

const ETF_COLOR_MAP = Object.fromEntries(ETF_REGISTRY.map(e => [e.code, e.color]));

const ACTION_LABELS: Record<string, string> = {
    BUY: '加碼', IN: '建倉', SELL: '減碼', OUT: '出清', CLOSE: '出清', TRIM: '減碼',
};

// ── Block 元件 ────────────────────────────────────────────────────────────────

function HoldingsBlock({ holdings }: { holdings: HoldingEtf[] }) {
    if (!holdings.length) return <p className="text-slate-400 text-xs">無持倉資料</p>;
    const sorted = [...holdings].sort((a, b) => b.weight - a.weight);
    return (
        <ul className="space-y-1.5">
            {sorted.map(h => {
                const delta = h.prev_weight != null ? h.weight - h.prev_weight : null;
                const meta = ETF_REGISTRY.find(e => e.code === h.etf_code);
                return (
                    <li key={h.etf_code} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs font-bold" style={{ color: meta?.color ?? '#6366f1' }}>{h.etf_code}</span>
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{h.weight.toFixed(2)}%</span>
                            {delta != null && (
                                <span className={`text-xs ${delta > 0 ? 'text-rose-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}{Math.abs(delta).toFixed(2)}pp
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
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{s.etf_codes.join(', ')}</span>
                </li>
            ))}
        </ul>
    );
}

function DiffsBlock({ diffs }: { diffs: DiffRow[] }) {
    if (!diffs.length) return <p className="text-slate-400 text-xs">無近期異動</p>;
    return (
        <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {diffs.map((d, i) => (
                <li key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-400 shrink-0">{d.data_date}</span>
                    <span className="font-mono text-indigo-500 shrink-0">{d.etf_code}</span>
                    <span className={`font-medium shrink-0 ${d.change_type === 'BUY' || d.change_type === 'IN' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {ACTION_LABELS[d.change_type] ?? d.change_type}
                    </span>
                    <span className="text-slate-500 ml-auto">{d.curr_weight != null ? `${d.curr_weight.toFixed(2)}%` : '—'}</span>
                </li>
            ))}
        </ul>
    );
}

function EquityBlock({ equity }: { equity: EquityRow | null }) {
    if (!equity) return <p className="text-slate-400 text-xs">無大戶資料</p>;
    const delta = equity.big_holder_pct_change;
    return (
        <div className="flex items-center gap-6 text-sm">
            <div>
                <div className="text-slate-400 text-xs mb-0.5">大戶持股比例</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 text-base">
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
            <div className="text-xs text-slate-400 ml-auto">{equity.snapshot_date}</div>
        </div>
    );
}

function AumBlock({ aum }: { aum: AumRow[] }) {
    if (!aum.length) return <p className="text-slate-400 text-xs">無 AUM 資料</p>;
    const sorted = [...aum].sort((a, b) => b.aum_100m - a.aum_100m);
    return (
        <ul className="space-y-1.5">
            {sorted.map(a => {
                const meta = ETF_REGISTRY.find(e => e.code === a.etf_code);
                return (
                    <li key={a.etf_code} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs font-bold" style={{ color: meta?.color ?? '#6366f1' }}>{a.etf_code}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{a.aum_100m.toFixed(1)} 億</span>
                    </li>
                );
            })}
        </ul>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{children}</h3>;
}

function Skeleton() {
    return (
        <div className="space-y-2 animate-pulse">
            {[80, 65, 75].map((w, i) => (
                <div key={i} className="h-3 bg-slate-200 dark:bg-slate-700 rounded" style={{ width: `${w}%` }} />
            ))}
        </div>
    );
}

function BlockWrapper({ id, title, loading, errors, children }: {
    id: string; title: string;
    loading: Set<string>; errors: Set<string>;
    children: React.ReactNode;
}) {
    return (
        <div>
            <SectionTitle>{title}</SectionTitle>
            {errors.has(id) ? (
                <p className="text-xs text-rose-400">載入失敗</p>
            ) : loading.has(id) ? (
                <Skeleton />
            ) : children}
        </div>
    );
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export function StockDetailSections({ stockCode }: { stockCode: string }) {
    const { data, loadingBlocks, errors } = useStockDetailData(stockCode);

    const holdings = data?.holdings ?? [];
    const etfCodes = holdings.map(h => h.etf_code);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 mb-4">
            <h2 className="text-sm font-bold mb-4 text-slate-800 dark:text-slate-200">🏦 ETF 持倉分析</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 持倉概況 */}
                <BlockWrapper id="holdings" title="持倉概況" loading={loadingBlocks} errors={errors}>
                    <HoldingsBlock holdings={holdings} />
                </BlockWrapper>

                {/* 近期異動 */}
                <BlockWrapper id="diffs" title="近期異動" loading={loadingBlocks} errors={errors}>
                    <DiffsBlock diffs={data?.diffs ?? []} />
                </BlockWrapper>

                {/* ETF 規模對比 */}
                <BlockWrapper id="aum" title="ETF 規模" loading={loadingBlocks} errors={errors}>
                    <AumBlock aum={data?.aum ?? []} />
                </BlockWrapper>

                {/* 訊號 */}
                <BlockWrapper id="signals" title="訊號" loading={loadingBlocks} errors={errors}>
                    <SignalsBlock signals={data?.signals ?? []} />
                </BlockWrapper>

                {/* 大戶籌碼 */}
                <BlockWrapper id="equity" title="大戶籌碼" loading={loadingBlocks} errors={errors}>
                    <EquityBlock equity={data?.equity ?? null} />
                </BlockWrapper>
            </div>

            {/* 比重走勢 × 股價 (full width) */}
            {etfCodes.length > 0 && !loadingBlocks.has('holdings') && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <SectionTitle>比重走勢 × 股價</SectionTitle>
                    <HoldingsPriceOverlayChart
                        stockCode={stockCode}
                        etfCodes={etfCodes}
                        etfColors={ETF_COLOR_MAP}
                    />
                </div>
            )}
        </div>
    );
}
