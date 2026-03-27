import { Edit, Trash2 } from 'lucide-react';
import { Clause } from './useClauses';

interface ClauseItemProps {
    clause: Clause;
    copyFeedback: string | null;
    onCopy: (text: string, id: string) => void;
    onEdit: (clause: Clause) => void;
    onDelete: (id: string) => void;
}

export function ClauseItem({ clause, copyFeedback, onCopy, onEdit, onDelete }: ClauseItemProps) {
    return (
        <div className={`group rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${
            clause.category === '基本特約'
                ? 'clause-basic-card bg-blue-50 ring-2 ring-blue-400 hover:shadow-blue-500/10 dark:ring-blue-400'
                : 'bg-white ring-1 ring-slate-100 hover:shadow-blue-500/5 dark:bg-slate-800 dark:ring-slate-700'
        }`}>
            <div className="flex flex-col sm:flex-row gap-6">
                {/* Left: Metadata */}
                <div className="sm:w-1/4 min-w-[200px] flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {(clause.tags || []).map(t => (
                            <span key={t} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                #{t}
                            </span>
                        ))}
                        {clause.usage_count > 0 && (
                            <span className="text-[10px] items-center gap-1 inline-flex text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                🔥 {clause.usage_count}
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">
                        {clause.title}
                    </h3>
                </div>

                {/* Center: Content */}
                <div className="flex-1 relative group/content">
                    <div
                        onClick={() => onCopy(clause.content, clause.id)}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-100 font-mono text-sm leading-relaxed text-slate-700 cursor-pointer hover:bg-blue-50/30 hover:border-blue-100 transition-colors relative max-h-[300px] overflow-y-auto custom-scrollbar"
                    >
                        <pre className="whitespace-pre-wrap font-sans">{clause.content}</pre>

                        {/* Copy Overlay Hint */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover/content:opacity-100 transition-opacity">
                            <span className={`text-[10px] px-2 py-1 rounded font-bold shadow-sm ${copyFeedback === clause.id
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white text-slate-500 border border-slate-200'
                                }`}>
                                {copyFeedback === clause.id ? '已複製！' : '點擊複製'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="sm:w-12 flex sm:flex-col gap-2 justify-start items-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(clause)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="編輯"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(clause.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="刪除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
