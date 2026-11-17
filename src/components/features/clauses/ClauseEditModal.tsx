import React, { useState } from 'react';
import { Clause } from './useClauses';
import { ClauseTagField } from './ClauseTagField';
import { CLAUSE_TOPICS, isClauseTopic } from '@/lib/constants/clauseTopics';

const FIELD_CLASS = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold';

interface ClauseEditModalProps {
    initialClause: Partial<Clause>;
    onClose: () => void;
    onSave: (clause: Partial<Clause>, isNew: boolean) => Promise<boolean>;
    onDelete?: (id: string) => void;
}

export function ClauseEditModal({ initialClause, onClose, onSave, onDelete }: ClauseEditModalProps) {
    const [currentClause, setCurrentClause] = useState<Partial<Clause>>(initialClause);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(currentClause, !currentClause.id);
        if (success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">
                        {currentClause.id ? '編輯條文' : '新增常用條文'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="sr-only">Close</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">
                                使用情境 (標題) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                value={currentClause.title || ''}
                                onChange={(e) => setCurrentClause({ ...currentClause, title: e.target.value })}
                                className={FIELD_CLASS}
                                placeholder="例如：現況交屋"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">
                                分類 <span className="text-rose-500">*</span>
                            </label>
                            <select
                                required
                                value={currentClause.category || '增補特約'}
                                onChange={(e) => setCurrentClause({ ...currentClause, category: e.target.value })}
                                className={FIELD_CLASS}
                            >
                                <option value="基本特約">基本特約</option>
                                <option value="增補特約">增補特約</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="clause-topic" className="text-sm font-bold text-slate-700">
                                主題 <span className="text-rose-500">*</span>
                            </label>
                            <select
                                id="clause-topic"
                                required
                                value={currentClause.topic ?? ''}
                                onChange={(e) => setCurrentClause({
                                    ...currentClause,
                                    topic: isClauseTopic(e.target.value) ? e.target.value : null,
                                })}
                                className={FIELD_CLASS}
                            >
                                <option value="">請選擇主題</option>
                                {CLAUSE_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="clause-note" className="text-sm font-bold text-slate-700">備註（選填）</label>
                            <textarea
                                id="clause-note"
                                rows={2}
                                value={currentClause.note ?? ''}
                                onChange={(e) => setCurrentClause({ ...currentClause, note: e.target.value })}
                                className={`${FIELD_CLASS} resize-y text-sm font-medium`}
                                placeholder="使用提醒，例如：氯離子和結構特約不可以壓在一起"
                            />
                        </div>
                    </div>

                    <ClauseTagField
                        tags={currentClause.tags ?? []}
                        onChange={(tags) => setCurrentClause({ ...currentClause, tags })}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">
                            條文內容 <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            required
                            value={currentClause.content || ''}
                            onChange={(e) => setCurrentClause({ ...currentClause, content: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[300px] resize-y text-sm leading-relaxed"
                            placeholder="輸入完整的合約條文..."
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        {currentClause.id && onDelete ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onDelete(currentClause.id!);
                                    onClose();
                                }}
                                className="text-rose-500 hover:text-rose-600 text-sm font-medium px-2 py-1 hover:bg-rose-50 rounded"
                            >
                                刪除條文
                            </button>
                        ) : (
                            <div></div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all hover:shadow-lg active:scale-95"
                            >
                                儲存
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
