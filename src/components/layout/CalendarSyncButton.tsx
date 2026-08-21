'use client';

import { useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { backfillCalendar } from '@/app/actions/calendarSync';
import { createClient } from '@/lib/auth/client';
import { GOOGLE_OAUTH_SCOPES } from '@/lib/google/calendar';

/**
 * 「同步到 Google 行事曆」按鈕：觸發一次性回填 Server Action，
 * 把案件四類日期寫入專用「案件」子行事曆，並回饋成功 / 需重新授權狀態。
 */
export const CalendarSyncButton = () => {
    const [syncing, setSyncing] = useState(false);

    /** 免登出重新走 Google 同意畫面，刷新 provider token（供 needs_reauth 時使用）。 */
    const handleReauth = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
                scopes: GOOGLE_OAUTH_SCOPES,
                queryParams: { access_type: 'offline', prompt: 'consent' },
            },
        });
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await backfillCalendar();
            if (result.status === 'ok') {
                const activeCases = result.activeCasesProcessed ?? 0;
                const todoCount = result.todosProcessed ?? 0;
                const written = result.eventsWritten ?? 0;
                const googleCount = result.googleEventCount;

                if (googleCount === 0 && written === 0) {
                    toast.warning(
                        `已掃描 ${activeCases} 件承辦中案件、${todoCount} 筆待辦，但 Google「案件」子行事曆仍為 0 筆事件。請確認案件是否已填寫用印/完稅等里程碑日期，或待辦是否有到期日。`,
                        { duration: 12000 }
                    );
                } else if (googleCount === 0 && written > 0) {
                    toast.warning(
                        `本次寫入 ${written} 筆，但 Google 仍顯示 0 筆。請確認左側已勾選「案件」子行事曆，且登入的是同一個 Google 帳號。`,
                        { duration: 12000 }
                    );
                } else {
                    toast.success(
                        `已在 Google「案件」子行事曆建立 ${googleCount ?? written} 筆事件（承辦中 ${activeCases} 件、待辦 ${todoCount} 筆；請在 Google 日曆左側勾選「案件」）`,
                        { duration: 10000 }
                    );
                }
            } else if (result.status === 'needs_reauth') {
                toast.error('Google 行事曆授權已失效', {
                    description: '免登出，點擊「重新授權」同意畫面即可繼續同步',
                    duration: 15000,
                    action: { label: '重新授權', onClick: handleReauth },
                });
            } else {
                toast.error('同步失敗：' + (result.error ?? '未知錯誤'));
            }
        } catch (err) {
            console.error('[CalendarSync] 回填失敗:', err);
            toast.error('同步失敗，請稍後再試');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            title="同步到 Google 行事曆"
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all disabled:opacity-60"
        >
            <span className="text-xl min-w-[24px] flex justify-center">
                {syncing ? <Loader2 size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
            </span>
            <span className="font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {syncing ? '同步中…' : '同步行事曆'}
            </span>
        </button>
    );
};

export default CalendarSyncButton;
