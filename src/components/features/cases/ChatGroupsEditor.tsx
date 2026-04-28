'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { caseService } from '@/services/caseService';

type ChatGroups = { line?: string; whatsapp?: string };
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const APP_CONFIG = [
    { key: 'line' as const,     icon: '💬', label: 'LINE',     placeholder: 'LINE 群組名稱…' },
    { key: 'whatsapp' as const, icon: '📱', label: 'WhatsApp', placeholder: 'WhatsApp 群組名稱…' },
];

interface RowProps {
    icon: string;
    label: string;
    placeholder: string;
    value: string;
    onSave: (v: string) => void;
}

function AppRow({ icon, label, placeholder, value, onSave }: RowProps) {
    const [draft, setDraft] = useState(value);
    const [editing, setEditing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerSave = useCallback((v: string) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onSave(v), 800);
    }, [onSave]);

    if (editing) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-[13px] w-5 shrink-0">{icon}</span>
                <span className="text-[11px] text-slate-400 w-16 shrink-0">{label}</span>
                <input
                    autoFocus
                    type="text"
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); triggerSave(e.target.value); }}
                    onBlur={() => setEditing(false)}
                    placeholder={placeholder}
                    className="flex-1 text-[13px] bg-white dark:bg-slate-700 border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-300"
                />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 w-full text-left group/row hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg px-1 py-0.5 transition-colors"
        >
            <span className="text-[13px] w-5 shrink-0">{icon}</span>
            <span className="text-[11px] text-slate-400 w-16 shrink-0">{label}</span>
            {draft ? (
                <span className="text-[13px] text-slate-600 dark:text-slate-300 flex-1 truncate">{draft}</span>
            ) : (
                <span className="text-[13px] text-slate-300 italic flex-1">{placeholder}</span>
            )}
            <span className="text-[11px] text-slate-300 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">編輯</span>
        </button>
    );
}

interface ChatGroupsEditorProps {
    caseId: string;
    initialGroups?: ChatGroups;
}

export default function ChatGroupsEditor({ caseId, initialGroups = {} }: ChatGroupsEditorProps) {
    const supabase = createClient();
    const [groups, setGroups] = useState<ChatGroups>(initialGroups);
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<SaveStatus>('idle');

    const handleSave = useCallback(async (key: keyof ChatGroups, value: string) => {
        const updated = { ...groups, [key]: value };
        setGroups(updated);
        setStatus('saving');
        try {
            await caseService.updateChatGroups(supabase, caseId, updated);
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        } catch {
            setStatus('error');
        }
    }, [groups, supabase, caseId]);

    const hasAny = !!(groups.line || groups.whatsapp);

    return (
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/30 overflow-hidden">
            {/* Header toggle */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center justify-between w-full px-2.5 py-1.5 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-700/40 transition-colors text-left"
            >
                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] transition-transform duration-200 text-slate-400 ${open ? 'rotate-90' : ''}`}>▶</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">📱 通訊群組</span>
                    {hasAny && !open && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                            {[groups.line, groups.whatsapp].filter(Boolean).join('・')}
                        </span>
                    )}
                </div>
                <span className={`text-[11px] font-bold ${
                    status === 'saving' ? 'text-amber-500' :
                    status === 'saved'  ? 'text-emerald-500' :
                    status === 'error'  ? 'text-red-500' : 'opacity-0'
                }`}>
                    {status === 'saving' ? '儲存中…' : status === 'saved' ? '✓' : status === 'error' ? '✗' : '·'}
                </span>
            </button>

            {/* Expanded rows */}
            {open && (
                <div className="flex flex-col gap-1 px-2.5 py-2 bg-white/60 dark:bg-slate-800/20">
                    {APP_CONFIG.map((app) => (
                        <AppRow
                            key={app.key}
                            icon={app.icon}
                            label={app.label}
                            placeholder={app.placeholder}
                            value={groups[app.key] ?? ''}
                            onSave={(v) => handleSave(app.key, v)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
