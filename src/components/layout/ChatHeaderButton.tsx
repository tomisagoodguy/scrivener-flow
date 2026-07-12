'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUnreadCount } from '../chat/hooks/useUnreadCount';
import { ChatPanel } from '../chat/ChatPanel';

export function ChatHeaderButton() {
    const { user } = useAuthUser();
    const [open, setOpen] = useState(false);
    const { totalUnread } = useUnreadCount(user?.id ?? null);

    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? '關閉聊天' : '開啟聊天'}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <MessageCircle size={18} />
                {totalUnread > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">
                        {totalUnread}
                    </span>
                )}
            </button>

            {open && <ChatPanel onClose={() => setOpen(false)} />}
        </>
    );
}
