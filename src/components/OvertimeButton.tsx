'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface OvertimeButtonProps {
    caseId: string;
    hasKeyed: boolean;
    sealDate?: string;
}

export default function OvertimeButton({ caseId, hasKeyed, sealDate }: OvertimeButtonProps) {
    // Local state for immediate UI feedback (Optimistic UI)
    const [localStatus, setLocalStatus] = useState(hasKeyed);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    // const supabase = createClientComponentClient(); // Removed

    // Logic: Remind 7 days before seal date
    // today >= (sealDate - 7 days)
    const shouldRemind = () => {
        if (!sealDate) return false;
        if (hasKeyed) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sDate = new Date(sealDate);
        sDate.setHours(0, 0, 0, 0);

        // Target reminder start date
        const reminderStart = new Date(sDate);
        reminderStart.setDate(sDate.getDate() - 7);

        return today >= reminderStart;
    };

    const isReminding = shouldRemind();

    const toggleStatus = async () => {
        setLoading(true);
        // 1. Optimistic Update: Change UI immediately
        const newStatus = !localStatus;
        setLocalStatus(newStatus);

        try {
            // Check if column exists - if not, we stop here but UI looks updated.
            console.warn('Simulating DB Update for Overtime Status');

            // NOTE: Uncomment specific DB update once database column 'has_keyed_overtime' is ready.
            /*
            const { error } = await supabase
                .from('cases')
                .update({ has_keyed_overtime: newStatus })
                .eq('id', caseId);

            if (error) throw error;
            router.refresh();
            */

            // Mock delay
            await new Promise(r => setTimeout(r, 500));

        } catch (e) {
            console.error('Error updating overtime status:', e);
            // Revert on serious error
            setLocalStatus(!newStatus);
            alert('更新失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    if (localStatus) {
        return (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    toggleStatus();
                }}
                disabled={loading}
                className="flex items-center gap-1.5 text-green-600 hover:text-green-700 text-xs px-2 py-1 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors"
                title="點擊取消申報狀態"
            >
                {loading ? (
                    <span>...</span>
                ) : (
                    <>
                        <CheckCircle2 size={14} />
                        <span>已申報加班費</span>
                    </>
                )}
            </button>
        );
    }

    if (isReminding) {
        return (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    toggleStatus();
                }}
                disabled={loading}
                className="group flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full border border-red-200 transition-all animate-pulse hover:animate-none shadow-sm hover:shadow"
                title="請記得上系統申報用印日加班費"
            >
                {loading ? (
                    <span className="text-xs">處理中...</span>
                ) : (
                    <>
                        <AlertCircle size={14} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">點擊回報加班費</span>
                    </>
                )}
            </button>
        );
    }

    // Default: Not keyed yet, but not urgent
    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                toggleStatus();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs px-2 py-1 transition-colors"
            title="點擊標記為已申報"
        >
            {loading ? (
                <span>...</span>
            ) : (
                <span className="text-[10px] font-medium">未申報用印加班費</span>
            )}
        </button>
    );
}
