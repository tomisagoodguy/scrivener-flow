'use client';

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RapidEventInput } from '@/components/todo/RapidEventInput';

interface Props {
    caseId: string;
    caseNumber: string;
    buyerName: string;
    sellerName: string;
}

export function CaseDetailRapidInput({ caseId, caseNumber, buyerName, sellerName }: Props) {
    const supabase = useMemo(() => createClient(), []);

    const handleAdd = async (
        content: string,
        dueDate: string,
        _endDate?: string,
        isAllDay: boolean = false,
    ) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('todos').insert([{
            user_id: user.id,
            content,
            is_completed: false,
            priority: 'not-urgent-important',
            due_date: new Date(dueDate).toISOString(),
            is_all_day: isAllDay,
            source_type: 'manual',
            case_id: caseId,
        }]);

        window.dispatchEvent(new CustomEvent('todo-updated'));
    };

    return (
        <div className="space-y-1">
            <p className="text-xs text-foreground/50 flex items-center gap-1">
                <span>閃點輸入</span>
                <span className="opacity-60">→ 自動綁定</span>
                <span className="font-mono text-foreground/70">{caseNumber}</span>
                {buyerName && <span className="text-foreground/60">{buyerName}</span>}
                {sellerName && <span className="text-foreground/60">/ {sellerName}</span>}
            </p>
            <RapidEventInput onAdd={handleAdd} persistent showHints={false} showSession={false} />
        </div>
    );
}
