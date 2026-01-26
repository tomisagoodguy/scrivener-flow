'use client';

import React from 'react';
import QuickNotes from '@/components/shared/QuickNotes';
import { DemoCase } from '@/types';

interface NotesSectionProps {
    notes: string;
    setNotes: React.Dispatch<React.SetStateAction<string>>;
    status: string;
    pendingTasks: string;
    privateNotes: string;
    setPrivateNotes: React.Dispatch<React.SetStateAction<string>>;
    cancellationType: string;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
    notes,
    setNotes,
    status,
    pendingTasks,
    privateNotes,
    setPrivateNotes,
    cancellationType
}) => {
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-rose-500">⚠️ 應注意 (Attention)</h4>
                    <textarea
                        name="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={10}
                        className="w-full bg-secondary/40 border-2 border-rose-100 rounded-xl p-3 text-sm"
                    />
                    <QuickNotes onSelect={(note) => setNotes((p) => (p ? `${p}\n${note}` : note))} />
                </div>
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-accent">目前狀態</h4>
                    <select
                        name="status"
                        defaultValue={status}
                        className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm cursor-pointer mb-4"
                    >
                        <option value="Processing">辦理中</option>
                        <option value="Closed">結案</option>
                    </select>
                    <h4 className="text-sm font-bold text-foreground/40">其他代辦事項</h4>
                    <textarea
                        name="pending_tasks"
                        defaultValue={pendingTasks}
                        rows={10}
                        className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm"
                    />
                </div>
            </div>

            <div className="space-y-2 pt-2 pb-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        🔒 詳細備註與特殊條款 (Private Notes)
                    </h4>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        不會顯示在列表
                    </span>
                </div>
                <textarea
                    name="private_notes"
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    rows={12}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="此欄位適合紀錄：
1. 複雜的合約條款
2. 案件的詳細處理經過
3. 目前遭遇的困難點
4. 任何需要長篇幅記錄但不希望干擾列表顯示的內容"
                />
            </div>

        </div>
    );
};
