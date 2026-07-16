'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUnreadCount } from '../chat/hooks/useUnreadCount';
import { nextBlinkBadgeState, type BlinkBadgeState } from '../chat/hooks/useBlinkingBadge';
import { ChatPanel } from '../chat/ChatPanel';

export function ChatHeaderButton() {
    const { user } = useAuthUser();
    const [open, setOpen] = useState(false);
    const { unreadByConversation } = useUnreadCount(user?.id ?? null);
    const [prevUnreadByConversation, setPrevUnreadByConversation] = useState(unreadByConversation);
    const [badgeStates, setBadgeStates] = useState<Record<string, BlinkBadgeState>>({});

    // React 官方建議的「render 期間依 props 調整 state」寫法，取代 useEffect + setState。
    if (unreadByConversation !== prevUnreadByConversation) {
        setPrevUnreadByConversation(unreadByConversation);
        setBadgeStates((prev) => {
            const next: Record<string, BlinkBadgeState> = {};
            for (const [id, unread] of Object.entries(unreadByConversation)) {
                next[id] = nextBlinkBadgeState(prev[id] ?? { displayCount: 0, isBlinking: false }, unread);
            }
            return next;
        });
    }

    if (!user) return null;

    const totalDisplay = Object.values(badgeStates).reduce((sum, s) => sum + s.displayCount, 0);
    const isBlinking = Object.values(badgeStates).some((s) => s.isBlinking);

    return (
        <>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? '關閉聊天' : '開啟聊天'}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <MessageCircle size={18} />
                {totalDisplay > 0 && (
                    <span
                        className={`absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center ${isBlinking ? 'animate-blink-badge' : ''}`}
                    >
                        {totalDisplay}
                    </span>
                )}
            </button>

            {open && <ChatPanel onClose={() => setOpen(false)} />}
        </>
    );
}
