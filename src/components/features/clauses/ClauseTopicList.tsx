import type { ClauseSection } from '@/lib/constants/clauseTopics';
import type { Clause } from './useClauses';
import { ClauseItem } from './ClauseItem';

interface ClauseTopicListProps {
    groups: ClauseSection<Clause>[];
    copyFeedback: string | null;
    onCopy: (text: string, id: string) => void;
    onEdit: (clause: Clause) => void;
    onDelete: (id: string) => void;
}

/** 依段落渲染條文；段落與排序由 buildClauseSections 決定 */
export function ClauseTopicList({ groups, copyFeedback, onCopy, onEdit, onDelete }: ClauseTopicListProps) {
    return (
        <div className="space-y-8">
            {groups.map((group) => (
                <section key={group.key} className="space-y-3" aria-label={group.key}>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 tracking-wider">{group.key}</h2>
                        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                            {group.clauses.length}
                        </span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    </div>
                    {group.clauses.map((clause) => (
                        <ClauseItem
                            key={clause.id}
                            clause={clause}
                            copyFeedback={copyFeedback}
                            onCopy={onCopy}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}
