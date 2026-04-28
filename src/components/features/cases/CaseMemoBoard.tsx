import Link from 'next/link';
import { DemoCase } from '@/types';
import CaseMemoCard from './CaseMemoCard';
import CaseMemoListView from './CaseMemoListView';
import MemoRealtimeRefresh from './MemoRealtimeRefresh';

interface CaseMemoBoardProps {
    cases: DemoCase[];
    view?: string;
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

const VIEW_TABS = [
    { value: 'all',     label: '全部' },
    { value: 'notes',   label: '⚠️ 應注意' },
    { value: 'pending', label: '📝 其他代辦' },
    { value: 'private', label: '🔒 私密備註' },
    { value: 'list',    label: '📋 緊湊清單' },
] as const;

function filterByView(cases: DemoCase[], view: string): DemoCase[] {
    if (view === 'notes')   return cases.filter((c) => !!c.notes?.replace(/\[\[ATTR:.*?\]\]/g, '').trim());
    if (view === 'pending') return cases.filter((c) => !!(c.pending_tasks ?? '').trim());
    if (view === 'private') return cases.filter((c) => !!(c.private_notes ?? '').trim());
    return cases; // 'all' and 'list' both show everything
}

export default function CaseMemoBoard({ cases, view = 'all' }: CaseMemoBoardProps) {
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

    const orderedCases = [...cases].sort(
        (a, b) => getNextMilestoneTime(a) - getNextMilestoneTime(b)
    );

    const filteredCases = filterByView(orderedCases, view);

    return (
        <div className="space-y-6">
            <MemoRealtimeRefresh />

            {/* Sub-view tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/70 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                {VIEW_TABS.map((tab) => {
                    const isActive = view === tab.value;
                    const showCount = tab.value !== 'list';
                    const count = showCount ? filterByView(orderedCases, tab.value).length : 0;
                    return (
                        <Link
                            key={tab.value}
                            href={`/cases?status=Memo&view=${tab.value}`}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                isActive
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                            {showCount && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                    isActive
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                }`}>
                                    {count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                    {filteredCases.length} 件{view === 'all' ? '承辦中' : ''}
                </span>
                {view === 'all' && warningCount > 0 && (
                    <span className="font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-xs">
                        ⚠️ {warningCount} 件有警示
                    </span>
                )}
                <span className="text-xs text-slate-400">點擊任一備註欄即可直接編輯，自動儲存</span>
            </div>

            {/* Cards */}
            {view === 'list' ? (
                <CaseMemoListView cases={filteredCases} />
            ) : filteredCases.length === 0 ? (
                <div className="glass-card p-16 text-center">
                    <p className="text-2xl mb-2">
                        {view === 'notes' ? '⚠️' : view === 'pending' ? '📝' : '🔒'}
                    </p>
                    <p className="text-slate-400 font-bold">目前沒有此類備註</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {filteredCases.map((c, i) => (
                        <CaseMemoCard
                            key={c.id}
                            caseData={c}
                            allCases={filteredCases}
                            currentIndex={i}
                            view={view}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
