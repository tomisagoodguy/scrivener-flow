'use client';

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RapidEventInput } from '@/components/todo/RapidEventInput';

interface CaseRef {
    id: string;
    case_number: string;
    buyer_name: string;
    seller_name: string;
}

interface Props {
    cases: CaseRef[];
}

/** 從 content tokens 或 caseNumber 中找出最佳匹配的案件 */
function resolveCase(cases: CaseRef[], content: string, caseNumber?: string): CaseRef | undefined {
    // 1. 精確案號（parser 已提取）
    if (caseNumber) {
        const hit = cases.find((c) => c.case_number.toUpperCase() === caseNumber.toUpperCase());
        if (hit) return hit;
    }

    // 2. 對 content 每個 token（>=2字）比對案號、買方、賣方
    const tokens = content.split(/\s+/).filter((t) => t.length >= 2);
    for (const token of tokens) {
        const hit = cases.find(
            (c) =>
                c.case_number.toUpperCase().includes(token.toUpperCase()) ||
                (c.buyer_name && c.buyer_name.includes(token)) ||
                (c.seller_name && c.seller_name.includes(token)),
        );
        if (hit) return hit;
    }

    return undefined;
}

export function CasesRapidInput({ cases }: Props) {
    const supabase = useMemo(() => createClient(), []);

    const handleAdd = async (
        content: string,
        dueDate: string,
        _endDate?: string,
        isAllDay: boolean = false,
        caseNumber?: string,
    ) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const matchedCase = resolveCase(cases, content, caseNumber);

        await supabase.from('todos').insert([{
            user_id: user.id,
            content,
            is_completed: false,
            priority: 'not-urgent-important',
            due_date: new Date(dueDate).toISOString(),
            is_all_day: isAllDay,
            source_type: 'manual',
            ...(matchedCase ? { case_id: matchedCase.id } : {}),
        }]);

        window.dispatchEvent(new CustomEvent('todo-updated'));
    };

    return <RapidEventInput onAdd={handleAdd} persistent showSession={false} />;
}
