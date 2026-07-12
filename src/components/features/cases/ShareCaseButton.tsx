'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2 } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ShareCasePanel } from './ShareCasePanel';

interface Props {
    caseId: string;
    isOwnedByCurrentUser: boolean;
}

/**
 * 案件詳情頁的分享入口，僅案件擁有者可見。
 * 比照 ChatPanel.tsx 的作法傳送門到 document.body：全站 <Header> 的
 * backdrop-blur-xl 會讓一般定位的子元素卡在 header 的堆疊層內，面板內容會被裁切/蓋住。
 */
export function ShareCaseButton({ caseId, isOwnedByCurrentUser }: Props) {
    const { user } = useAuthUser();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    const handleToggle = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
        }
        setOpen((v) => !v);
    };

    if (!isOwnedByCurrentUser || !user) return null;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-500 transition-all"
            >
                <Share2 size={14} />
                分享
            </button>
            {open &&
                mounted &&
                createPortal(
                    <div
                        className="fixed z-999 w-96 max-w-[calc(100vw-2rem)]"
                        style={{ top: coords.top, right: coords.right }}
                    >
                        <ShareCasePanel caseId={caseId} currentUserId={user.id} onClose={() => setOpen(false)} />
                    </div>,
                    document.body
                )}
        </>
    );
}
