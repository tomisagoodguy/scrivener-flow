'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { createClient } from '@/lib/supabase/client';
import { rejectShare } from '@/services/caseShareService';

interface Props {
    caseId: string;
    isOwnedByCurrentUser: boolean;
}

/**
 * 分享對象在共享案件畫面上駁回分享的入口，僅案件擁有者以外的使用者可見。
 * 駁回後 RLS 立即收回可見性，導回 /cases；不通知案件擁有者。
 */
export function RejectShareButton({ caseId, isOwnedByCurrentUser }: Props) {
    const { user } = useAuthUser();
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    if (isOwnedByCurrentUser || !user) return null;

    const handleReject = async () => {
        setSubmitting(true);
        const supabase = createClient();
        await rejectShare(supabase, caseId, user.id);
        router.push('/cases');
    };

    if (confirming) {
        return (
            <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">確定要駁回這個案件的分享嗎？</span>
                <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                    {submitting ? '處理中...' : '確定駁回'}
                </button>
                <button onClick={() => setConfirming(false)} className="text-slate-400 hover:text-slate-600">
                    取消
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:text-red-500 transition-all"
        >
            <ShieldOff size={14} />
            駁回分享
        </button>
    );
}
