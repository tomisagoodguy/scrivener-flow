'use client';

import { X, Loader2 } from 'lucide-react';
import { useCaseShares } from './edit-case/useCaseShares';
import { chatDisplayName } from '@/lib/chat/chatService';

interface Props {
    caseId: string;
    currentUserId: string;
    onClose: () => void;
}

function formatRejectedAt(rejectedAt: string | null): string {
    if (!rejectedAt) return '';
    const d = new Date(rejectedAt);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 案件擁有者的分享管理面板：列出現有分享名單，可搜尋新增/移除分享對象，並查看/處理被駁回的分享。 */
export function ShareCasePanel({ caseId, currentUserId, onClose }: Props) {
    const {
        activeShares,
        rejectedShares,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        searchResults,
        addUser,
        removeUser,
        reactivateUser,
    } = useCaseShares(caseId, currentUserId);

    return (
        <div className="glass-card rounded-3xl p-4 flex flex-col gap-3 max-w-md w-full">
            <div className="flex items-center justify-between">
                <h3 className="font-black text-sm">分享此案件</h3>
                <button onClick={onClose} aria-label="關閉" className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                </button>
            </div>

            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">目前分享對象</p>
                {loading ? (
                    <div className="flex items-center justify-center py-4 text-slate-400">
                        <Loader2 className="animate-spin" size={18} />
                    </div>
                ) : activeShares.length === 0 ? (
                    <p className="text-xs text-slate-400 py-1">尚未分享給任何人</p>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {activeShares.map((s) => (
                            <li
                                key={s.id}
                                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50"
                            >
                                <span className="text-sm truncate">
                                    {chatDisplayName({ email: s.email, full_name: s.fullName })}
                                </span>
                                <button
                                    onClick={() => removeUser(s.shared_with)}
                                    className="text-[11px] font-bold text-red-500 hover:text-red-600 shrink-0"
                                >
                                    移除
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {!loading && rejectedShares.length > 0 && (
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">已駁回</p>
                    <ul className="flex flex-col gap-1">
                        {rejectedShares.map((s) => (
                            <li
                                key={s.id}
                                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50"
                            >
                                <span className="text-sm truncate text-slate-500 dark:text-slate-400">
                                    已駁回：{chatDisplayName({ email: s.email, full_name: s.fullName })}
                                    （{formatRejectedAt(s.rejected_at)}）
                                </span>
                                <button
                                    onClick={() => reactivateUser(s.shared_with)}
                                    className="text-[11px] font-bold text-blue-500 hover:text-blue-600 shrink-0"
                                >
                                    重新分享
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">新增分享對象</p>
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋同事 email 或姓名..."
                    className="w-full bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-2 text-sm outline-none mb-2"
                />
                <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {searchResults.map((u) => (
                        <li key={u.id}>
                            <button
                                onClick={() => addUser(u.id)}
                                className="w-full text-left flex items-center gap-2 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 text-sm truncate"
                            >
                                {chatDisplayName(u)}
                            </button>
                        </li>
                    ))}
                    {!loading && searchResults.length === 0 && (
                        <li className="text-xs text-slate-400 py-1">找不到可分享的使用者</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
