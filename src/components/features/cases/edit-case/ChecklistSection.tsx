'use client';

import React from 'react';
import CaseTodos from '@/components/features/cases/CaseTodos';
import { DemoCase } from '@/types';

interface ChecklistSectionProps {
    initialData: DemoCase;
}

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({ initialData }) => {
    // Filter out legacy items so they don't appear as custom items even if they exist in DB
    const todos = { ...(initialData.todos || {}) };
    delete (todos as any)['S_權狀印鑑'];
    delete (todos as any)['S_稅單'];
    
    const filteredTodos = todos;

    const SIGNING_ITEMS = [
        '買方蓋印章', '賣方蓋印章', '用印款', '完稅款', '權狀', '印鑑',
        '授權', '解約排除', '規費', '設定', '等稅單', '已繳稅單', '差額', '整過戶',
    ];

    const TRANSFER_ITEMS = [
        '整交屋', '實登', '打單', '履保', '水電', '稅費分算', '保單', '代償', '塗銷', '二撥',
    ];

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-bold text-accent dark:text-white! border-l-4 border-accent pl-3">辦事清單 (Checklist)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-border-color rounded-xl bg-secondary/20">
                    <h4 className="text-xs font-black text-foreground/40 mb-2 uppercase">簽約與用印階段</h4>
                    <CaseTodos
                        caseId={initialData.id}
                        initialTodos={filteredTodos}
                        items={SIGNING_ITEMS}
                        hideCompleted={false}
                        allowAdd={true}
                        prefix="S_"
                    />
                </div>
                <div className="p-4 border border-border-color rounded-xl bg-secondary/20">
                    <h4 className="text-xs font-black text-foreground/40 mb-2 uppercase">過戶與交屋階段</h4>
                    <CaseTodos
                        caseId={initialData.id}
                        initialTodos={filteredTodos}
                        items={TRANSFER_ITEMS}
                        hideCompleted={false}
                        allowAdd={true}
                        prefix="T_"
                        catchUncategorized={true}
                    />
                </div>
            </div>
        </div>
    );
};
