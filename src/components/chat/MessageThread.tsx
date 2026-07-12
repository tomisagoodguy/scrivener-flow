'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Undo2 } from 'lucide-react';
import { useChatRealtime } from './hooks/useChatRealtime';

interface Props {
    conversationId: string;
    currentUserId: string;
    userNameById: Record<string, string>;
}

export function MessageThread({ conversationId, currentUserId, userNameById }: Props) {
    const { messages, sendMessage, recallMessage } = useChatRealtime(conversationId, currentUserId);
    const [draft, setDraft] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    }, [draft]);

    const submitDraft = () => {
        if (!draft.trim()) return;
        sendMessage(draft);
        setDraft('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitDraft();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitDraft();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 p-2">
                {messages.map((m) => {
                    const isMine = m.sender_id === currentUserId;
                    const isRecalled = m.deleted_at !== null;
                    return (
                        <div key={m.id} className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            {!isMine && (
                                <span className="text-[10px] text-slate-400 px-1">{userNameById[m.sender_id] ?? m.sender_id}</span>
                            )}
                            <div className="flex items-center gap-1">
                                {isMine && !isRecalled && m.status === 'sent' && (
                                    <button
                                        onClick={() => recallMessage(m.id)}
                                        aria-label="收回訊息"
                                        title="收回訊息"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    >
                                        <Undo2 size={14} />
                                    </button>
                                )}
                                <div
                                    className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${isRecalled
                                        ? 'italic text-slate-400 bg-transparent border border-dashed border-slate-300 dark:border-slate-700'
                                        : isMine
                                            ? 'bg-blue-600 text-white'
                                            : 'glass-card'
                                        }`}
                                >
                                    {isRecalled ? '此訊息已收回' : m.content}
                                </div>
                            </div>
                            {m.status === 'failed' && <span className="text-[10px] text-red-500 px-1">送出失敗</span>}
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-white/20">
                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="輸入訊息...（Enter 送出，Shift+Enter 換行）"
                    rows={1}
                    className="flex-1 resize-none max-h-32 overflow-y-auto bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-2 text-sm outline-none custom-scrollbar"
                />
                <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="bg-blue-600 text-white rounded-xl px-3 disabled:bg-slate-300 transition-colors shrink-0"
                    aria-label="送出"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
