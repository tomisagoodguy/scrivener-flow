'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { createClient } from '@/lib/supabase/client';
import { listChatUsers, markConversationRead, hideConversation, chatDisplayName } from '@/lib/chat/chatService';
import { useConversationList } from './hooks/useConversationList';
import { useUnreadCount } from './hooks/useUnreadCount';
import { useOnlinePresence } from './hooks/useOnlinePresence';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { NewConversationPicker } from './NewConversationPicker';

interface Props {
    onClose: () => void;
}

export function ChatPanel({ onClose }: Props) {
    const { user } = useAuthUser();
    const currentUserId = user?.id ?? null;

    const { conversations, refresh: refreshConversations } = useConversationList(currentUserId);
    const { unreadByConversation, refresh: refreshUnread } = useUnreadCount(currentUserId);
    const onlineUserIds = useOnlinePresence(currentUserId);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [userNameById, setUserNameById] = useState<Record<string, string>>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!currentUserId) return;
        listChatUsers(createClient())
            .then((users) => {
                const map: Record<string, string> = {};
                for (const u of users) map[u.id] = chatDisplayName(u);
                map[currentUserId] = chatDisplayName({ email: user?.email ?? null, full_name: user?.user_metadata?.full_name ?? null });
                setUserNameById(map);
            })
            .catch((err) => console.error('取得使用者清單失敗:', err instanceof Error ? err.message : err));
    }, [currentUserId, user?.email, user?.user_metadata?.full_name]);

    // createPortal 需要 document.body，SSR 階段不存在，掛載後才標記為可傳送門
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    const handleSelect = useCallback(
        async (conversationId: string) => {
            setSelectedId(conversationId);
            if (!currentUserId) return;
            try {
                await markConversationRead(createClient(), conversationId, currentUserId);
                refreshUnread();
            } catch (err) {
                console.error('標記已讀失敗:', err instanceof Error ? err.message : err);
            }
        },
        [currentUserId, refreshUnread]
    );

    const handleCreated = (conversationId: string) => {
        setShowPicker(false);
        refreshConversations();
        handleSelect(conversationId);
    };

    const handleHide = useCallback(
        async (conversationId: string) => {
            if (!currentUserId) return;
            try {
                await hideConversation(createClient(), conversationId, currentUserId);
                if (selectedId === conversationId) setSelectedId(null);
                refreshConversations();
            } catch (err) {
                console.error('刪除對話失敗:', err instanceof Error ? err.message : err);
            }
        },
        [currentUserId, selectedId, refreshConversations]
    );

    if (!currentUserId || !mounted) return null;

    // 傳送門到 document.body：header 的 backdrop-blur-xl 會讓 fixed 定位的子元素
    // 改以 header 自身為 containing block，導致面板被卡在 header 的堆疊層內。
    return createPortal(
        <div className="fixed right-4 top-20 md:right-6 md:top-24 w-[360px] h-[520px] max-h-[70vh] z-999 flex flex-col gap-3">
            {showPicker ? (
                <NewConversationPicker
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                    onClose={() => setShowPicker(false)}
                    onCreated={handleCreated}
                />
            ) : (
                <div className="glass-card rounded-3xl p-4 flex flex-col gap-3 h-full">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-sm">聊天</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowPicker(true)} aria-label="開新對話" className="text-slate-400 hover:text-blue-600">
                                <UserPlus size={18} />
                            </button>
                            <button onClick={onClose} aria-label="關閉" className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {selectedId ? (
                        <div className="flex-1 min-h-0 flex flex-col">
                            <button onClick={() => setSelectedId(null)} className="text-xs text-slate-400 self-start mb-1">
                                ← 返回對話清單
                            </button>
                            <div className="flex-1 min-h-0">
                                <MessageThread conversationId={selectedId} currentUserId={currentUserId} userNameById={userNameById} />
                            </div>
                        </div>
                    ) : (
                        <ConversationList
                            conversations={conversations}
                            unreadByConversation={unreadByConversation}
                            selectedId={selectedId}
                            currentUserId={currentUserId}
                            userNameById={userNameById}
                            onlineUserIds={onlineUserIds}
                            onSelect={handleSelect}
                            onHide={handleHide}
                        />
                    )}
                </div>
            )}
        </div>,
        document.body
    );
}
