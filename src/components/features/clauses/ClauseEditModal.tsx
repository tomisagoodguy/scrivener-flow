import React, { useState } from 'react';
import { Tag, Plus } from 'lucide-react';
import { Clause } from './useClauses';

interface ClauseEditModalProps {
    initialClause: Partial<Clause>;
    onClose: () => void;
    onSave: (clause: Partial<Clause>, isNew: boolean) => Promise<boolean>;
    onDelete?: (id: string) => void;
}

export function ClauseEditModal({ initialClause, onClose, onSave, onDelete }: ClauseEditModalProps) {
    const [currentClause, setCurrentClause] = useState<Partial<Clause>>(initialClause);
    const [tagInput, setTagInput] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(currentClause, !currentClause.id);
        if (success) {
            onClose();
        }
    };

    const addTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !(currentClause.tags || []).includes(trimmed)) {
            setCurrentClause({
                ...currentClause,
                tags: [...(currentClause.tags || []), trimmed]
            });
            setTagInput('');
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">
                                使用情境 (標題) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                value={currentClause.title || ''}
                                onChange={(e) => setCurrentClause({ ...currentClause, title: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                placeholder="例如：現況交屋"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-emerald-500" />
                                標籤管理
                            </label>
                            <div className="flex gap-2">
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                    placeholder="例如:現況、違約、交屋"
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    disabled={!tagInput.trim()}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    新增
                                </button>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1">
                                    💡 提示: 輸入標籤後按
                                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-600 font-mono">Enter</kbd>
                                    或點擊「新增」按鈕
                                </span>
                            </div>
                            <div className="min-h-[40px] bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                {(currentClause.tags || []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {(currentClause.tags || []).map(t => (
                                            <span key={t} className="bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-shadow">
                                                #{t}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentClause({
                                                        ...currentClause,
                                                        tags: currentClause.tags?.filter(tag => tag !== t)
                                                    })}
                                                    className="hover:text-rose-500 text-emerald-400 hover:scale-110 transition-all"
                                                    title="移除標籤"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" />
                                        尚未新增標籤 - 標籤可幫助您快速分類與搜尋條文
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

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
