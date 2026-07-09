import type { DualTrackSignalItem } from '@/app/actions/getManagerDualTrack';

const SIGNAL_LABELS: Record<string, string> = {
    quarterly_promotion: '季報晉升',
    quarterly_latent_etf: '季報潛伏ETF激活',
    fund_consensus: '多基金共識',
    consecutive_add: '連續加碼',
    high_weight_cut: '高權重減碼',
    core_exit: '核心出場',
};

const NEGATIVE_SIGNAL_TYPES = new Set(['high_weight_cut', 'core_exit']);

function SignalBadge({ type }: { type: string }) {
    const isNegative = NEGATIVE_SIGNAL_TYPES.has(type);
    const colorClass = isNegative
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
    return (
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
            {SIGNAL_LABELS[type] ?? type}
        </span>
    );
}

export default function SignalsPanel({ signals }: { signals: DualTrackSignalItem[] }) {
    return (
        <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                近 3 期基金訊號
                <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                    月頻雙軌
                </span>
            </h3>

            {signals.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">近期無此經理人相關的基金訊號。</p>
            ) : (
                <div className="space-y-2">
                    {signals.map((s) => (
                        <div
                            key={s.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/40 dark:bg-slate-800/40 text-xs"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <SignalBadge type={s.signal_type} />
                                <span className="font-medium text-slate-700 dark:text-slate-200">{s.stock_code}</span>
                                <span className="text-slate-400">{s.period}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-slate-500 dark:text-slate-400">強度 {s.strength}</span>
                                {s.fund_names.length > 0 && (
                                    <span className="text-slate-400 truncate max-w-[10rem]">
                                        {s.fund_names.join('、')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
