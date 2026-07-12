'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { listChatUsers, findOrCreateDirectConversation, createGroupConversation, chatDisplayName } from '@/lib/chat/chatService';
import { OnlineDot } from './OnlineDot';
import type { ChatUser } from '@/types/chat';

interface Props {
    currentUserId: string;
    onlineUserIds: Set<string>;
    onClose: () => void;
    onCreated: (conversationId: string) => void;
}

export function NewConversationPicker({ currentUserId, onlineUserIds, onClose, onCreated }: Props) {
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const supabase = createClient();
            const result = await listChatUsers(supabase);
            setUsers(result);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : '取得使用者清單失敗');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const toggleUser = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const handleConfirm = async () => {
        if (selectedIds.length === 0) return;
        setSubmitting(true);
        setErrorMsg(null);
        try {
            const supabase = createClient();
            const conversation =
                selectedIds.length === 1
                    ? await findOrCreateDirectConversation(supabase, currentUserId, selectedIds[0])
                    : await createGroupConversation(supabase, currentUserId, selectedIds, groupName);
            onCreated(conversation.id);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : '建立對話失敗');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="glass-card rounded-3xl p-4 flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
                <h3 className="font-black text-sm">開新對話</h3>
                <button onClick={onClose} aria-label="關閉" className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                </button>
            </div>

            {errorMsg && <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>}

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                    <Loader2 className="animate-spin" size={20} />
                </div>
            ) : (
                <ul className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                    {users.map((u) => (
                        <li key={u.id}>
                            <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(u.id)}
                                    onChange={() => toggleUser(u.id)}
                                />
                                <OnlineDot online={onlineUserIds.has(u.id)} />
                                <span className="text-sm truncate">{chatDisplayName(u)}</span>
                            </label>
                        </li>
                    ))}
                </ul>
            )}

            {selectedIds.length > 1 && (
                <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="群組名稱"
                    className="bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-2 text-sm outline-none"
                />
            )}

            <button
                onClick={handleConfirm}
                disabled={submitting || selectedIds.length === 0 || (selectedIds.length > 1 && !groupName.trim())}
                className="bg-blue-600 text-white rounded-xl py-2 text-sm font-bold disabled:bg-slate-300 transition-colors"
            >
                {submitting ? '建立中...' : selectedIds.length > 1 ? '建立群組' : '開始聊天'}
            </button>
        </div>
    );
}
