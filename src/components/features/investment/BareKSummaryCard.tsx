import Link from 'next/link';
import type { WatchListEntry } from '@/app/api/investment/bare-k/route';

const SIGNAL_META: Record<string, { label: string; color: string }> = {
    hit260:     { label: '創260高', color: '#E74C3C' },
    low_vol:    { label: '低波動',  color: '#27AE60' },
    margin_ok:  { label: '融資健康', color: '#2E86C1' },
    rev_9max:   { label: '營收9月高', color: '#F39C12' },
    trust_ok:   { label: '投信買超', color: '#8E44AD' },
};

const SIGNAL_KEYS = ['hit260', 'low_vol', 'margin_ok', 'rev_9max', 'trust_ok'] as const;

function DistBadge({ pct }: { pct: number | null }) {
    if (pct === null) return null;
    const color =
        pct >= -2  ? 'text-green-600 bg-green-50 border-green-200' :
        pct >= -10 ? 'text-orange-500 bg-orange-50 border-orange-200' :
                    'text-red-500 bg-red-50 border-red-200';
    return (
        <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${color}`}>
            距260高 {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
        </span>
    );
}

export function BareKSummaryCard({ entry, index }: { entry: WatchListEntry; index: number }) {
    const s = entry.summary;
    const signals = s?.signals;

    return (
        <Link
            href={`/investment/bare-k/${entry.stock_id}`}
            className="glass-card block rounded-2xl p-4 hover:shadow-md transition-all animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* 標題 */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <span className="font-bold text-gray-800 text-base">{entry.stock_id}</span>
                    {entry.name && (
                        <span className="ml-1.5 text-sm text-gray-500">{entry.name}</span>
                    )}
                    {entry.strategies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {entry.strategies.map((st) => (
                                <span key={st} className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-500 border border-orange-200 rounded-full">
                                    {st}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {s && (
                    <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{s.last_price.toFixed(2)}</div>
                        <div className={`text-sm font-medium ${s.change_pct >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                        </div>
                    </div>
                )}
            </div>

            {s ? (
                <>
                    <div className="mb-2">
                        <DistBadge pct={s.dist_260_pct} />
                    </div>
                    {/* 訊號燈 */}
                    <div className="flex gap-1 flex-wrap">
                        {signals && SIGNAL_KEYS.map((key) => {
                            const meta = SIGNAL_META[key];
                            const active = signals[key];
                            return (
                                <span
                                    key={key}
                                    className="text-[10px] px-1.5 py-0.5 rounded-full border"
                                    style={active
                                        ? { color: meta.color, borderColor: meta.color, background: `${meta.color}18` }
                                        : { color: '#bbb', borderColor: '#ddd', background: 'transparent' }
                                    }
                                >
                                    {active ? '✓' : '·'} {meta.label}
                                </span>
                            );
                        })}
                    </div>
                </>
            ) : (
                <p className="text-xs text-gray-400 mt-1">資料同步中，每日台灣時間 22:00 後更新</p>
            )}
        </Link>
    );
}
