import { DemoCase } from '@/types';
import CaseMemoCard from './CaseMemoCard';
import MemoRealtimeRefresh from './MemoRealtimeRefresh';

interface CaseMemoBoard {
    cases: DemoCase[];
}

function getNextMilestoneTime(c: DemoCase): number {
    const m = c.milestones?.[0];
    if (!m) return Infinity;
    const now = Date.now();
    const dates = [m.seal_date, m.tax_payment_date, m.transfer_date, m.handover_date]
        .filter(Boolean)
        .map((d) => new Date(d!).getTime())
        .filter((t) => t >= now)
        .sort((a, b) => a - b);
    return dates[0] ?? Infinity;
}

export default function CaseMemoBoard({ cases }: CaseMemoBoard) {
    const warningCount = cases.filter(
        (c) => c.notes && c.notes.replace(/\[\[ATTR:.*?\]\]/g, '').trim()
    ).length;

    if (cases.length === 0) {
        return (
            <div className="glass-card p-16 text-center">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-slate-400 font-bold">目前沒有案件</p>
            </div>
        );
    }

    // 按最近里程碑日期排序（由近到遠），沒有日期的排最後
    const orderedCases = [...cases].sort(
        (a, b) => getNextMilestoneTime(a) - getNextMilestoneTime(b)
    );

    return (
        <div className="space-y-6">
            <MemoRealtimeRefresh />
            {/* Stats */}
            <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                    {cases.length} 件承辦中
                </span>
                {warningCount > 0 && (
                    <span className="font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-xs">
                        ⚠️ {warningCount} 件有警示
                    </span>
                )}
                <span className="text-xs text-slate-400">點擊任一備註欄即可直接編輯，自動儲存</span>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {orderedCases.map((c, i) => (
                    <CaseMemoCard
                        key={c.id}
                        caseData={c}
                        allCases={orderedCases}
                        currentIndex={i}
                    />
                ))}
            </div>
        </div>
    );
}
