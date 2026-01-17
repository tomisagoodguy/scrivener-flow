'use client';

import { useState } from 'react';
import { createClient } from '@/lib/auth/client';
import { GoogleCalendarService, GoogleCalendarEvent } from '@/lib/googleCalendar';
import { DemoCase, Milestone } from '@/types';
import { Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
    caseData: DemoCase;
}

export function GoogleCalendarSyncButton({ caseData }: Props) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSync = async () => {
        setStatus('loading');
        setMessage('');

        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            // Note: provider_token is often only available immediately after login in the session object
            // If it's missing, the user might need to re-login.
            // Type assertion used because provider_token exists on the session object from OAuth provider but might not be in the core type definition depending on version.
            const accessToken = (session as any)?.provider_token;

            if (!accessToken) {
                throw new Error('無法取得 Google 授權。請嘗試登出並重新登入 (勾選行事曆權限)。');
            }

            const calendarService = new GoogleCalendarService(accessToken);

            // Generate Events from Milestones
            const events = generateEvents(caseData);

            if (events.length === 0) {
                setStatus('success');
                setMessage('無日期可同步');
                return;
            }

            let successCount = 0;
            for (const event of events) {
                await calendarService.createEvent(event);
                successCount++;
            }

            setStatus('success');
            setMessage(`成功同步 ${successCount} 個行程`);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 3000);
        } catch (error: any) {
            console.error('Calendar Sync Error:', error);
            setStatus('error');
            setMessage(error.message || '同步失敗');
        } finally {
            if (status !== 'error') {
                // setStatus('idle'); // Keep success state for a bit? No, handled above.
            }
        }
    };

    return (
        <div className="flex items-center gap-2">
            {message && (
                <span className={`text-xs ${status === 'error' ? 'text-red-500' : 'text-emerald-500'} animate-fade-in`}>
                    {message}
                </span>
            )}
            <button
                onClick={handleSync}
                disabled={status === 'loading'}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${
                        status === 'success'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    }
                `}
                title="同步至 Google 行事曆"
            >
                {status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : status === 'success' ? (
                    <Check className="w-4 h-4" />
                ) : (
                    <Calendar className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">同步行事曆</span>
            </button>
        </div>
    );
}

function generateEvents(caseData: DemoCase): GoogleCalendarEvent[] {
    const events: GoogleCalendarEvent[] = [];
    // Handle potential array or single object structure from Supabase join
    const mRaw = caseData.milestones;
    const m = (caseData.milestones?.[0] || {}) as any;

    if (!m) {
        console.warn('GoogleCalendarSync: No milestones found', caseData);
        return [];
    }

    const caseTitle = `[案件 ${caseData.buyer_name || caseData.case_number}]`;

    // Helper to add event
    const add = (date: string | undefined, title: string) => {
        if (date) {
            events.push({
                summary: `${caseTitle} ${title}`,
                description: `案號: ${caseData.case_number}\n買方: ${caseData.buyer_name}\n賣方: ${caseData.seller_name}`,
                start: { date: date }, // All day event
                end: { date: date }, // Google All-Day is inclusive? Actually Google Calendar API "end" is exclusive for all-day events. I should parse and add 1 day.
            });
        }
    };

    // Correcting Date logic: Google Calendar API end date is exclusive for all-day events.
    // So if start is 2026-01-01, end should be 2026-01-02.
    // However, keeping it simple: usually users read "Start Date".
    // Let's implement correct +1 day logic.

    const addFullDay = (dateStr: string | undefined, title: string) => {
        if (!dateStr) return;

        // Parse current date
        const startDate = new Date(dateStr);
        // Create end date (next day)
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const toIsoDate = (d: Date) => d.toISOString().split('T')[0];

        events.push({
            summary: `${caseTitle} ${title}`,
            description: `案號: ${caseData.case_number}\n買方: ${caseData.buyer_name}\n賣方: ${caseData.seller_name}`,
            start: { date: dateStr },
            end: { date: toIsoDate(endDate) },
        });
    };

    addFullDay(m.contract_date, '簽約');
    addFullDay(m.seal_date, '用印');
    addFullDay(m.tax_payment_date, '完稅');
    addFullDay(m.transfer_date, '過戶');
    addFullDay(m.handover_date, '交屋');

    return events;
}
