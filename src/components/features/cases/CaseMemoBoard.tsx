import { DemoCase } from '@/types';
import CaseMemoCard from './CaseMemoCard';

interface CaseMemoBoard {
    cases: DemoCase[];
}

export default function CaseMemoBoard({ cases }: CaseMemoBoard) {
    const casesWithNotes = cases.filter(
        (c) =>
            (c.notes && c.notes.replace(/\[\[ATTR:.*?\]\]/g, '').trim()) ||
            c.pending_tasks ||
            c.private_notes
    );

    // Cases without any notes — show them too so user can add notes directly
    const casesWithoutNotes = cases.filter(
        (c) =>
            !(c.notes && c.notes.replace(/\[\[ATTR:.*?\]\]/g, '').trim()) &&
            !c.pending_tasks &&
            !c.private_notes
    );

    const warningCount = casesWithNotes.filter(
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

    return (
        <div className="space-y-6">
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

            {/* Cards with notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {casesWithNotes.map((c) => (
                    <CaseMemoCard key={c.id} caseData={c} />
                ))}
                {casesWithoutNotes.map((c) => (
                    <CaseMemoCard key={c.id} caseData={c} />
                ))}
            </div>
        </div>
    );
}
