import type { ConsensusSignal } from '@/types';

export default function ConsensusSummaryCards({ signals }: { signals: ConsensusSignal[] }) {
    const triple = signals.filter((s) => s.consensus_count === 3).length;
    const double = signals.filter((s) => s.consensus_count === 2).length;
    const single = signals.filter((s) => s.consensus_count === 1).length;

    const cards = [
        { label: '三重共識', count: triple, color: 'from-violet-500/20 to-purple-500/10 border-violet-300/40 dark:border-violet-700/40 text-violet-700 dark:text-violet-300' },
        { label: '雙重共識', count: double, color: 'from-blue-500/20 to-indigo-500/10 border-blue-300/40 dark:border-blue-700/40 text-blue-700 dark:text-blue-300' },
        { label: '單一訊號', count: single, color: 'from-slate-100/80 to-slate-50/60 border-slate-200/60 dark:border-slate-700/40 text-slate-600 dark:text-slate-400' },
    ];

    return (
        <div className="grid grid-cols-3 gap-3">
            {cards.map(({ label, count, color }) => (
                <div key={label} className={`glass-card p-4 bg-gradient-to-br border ${color}`}>
                    <div className="text-2xl font-black">{count}</div>
                    <div className="text-xs font-semibold mt-0.5 opacity-80">{label}</div>
                </div>
            ))}
        </div>
    );
}
