'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DemoCase, Milestone } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function getNextMilestone(milestone: Milestone | undefined) {
    if (!milestone) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const steps = [
        { label: '簽', date: milestone.contract_date },
        { label: '印', date: milestone.seal_date },
        { label: '稅', date: milestone.tax_payment_date },
        { label: '過', date: milestone.transfer_date },
        { label: '交', date: milestone.handover_date },
    ];
    return (
        steps
            .filter((s) => s.date)
            .map((s) => ({ ...s, time: new Date(s.date!).getTime() }))
            .filter((s) => s.time >= today.getTime())
            .sort((a, b) => a.time - b.time)[0] ?? null
    );
}

function formatShortDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function countPendingTodos(todos: Record<string, boolean> | undefined) {
    if (!todos) return 0;
    return Object.values(todos).filter((v) => !v).length;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── editable note field ───────────────────────────────────────────────────────

interface EditableNoteProps {
    icon: string;
    value: string;
    placeholder: string;
    textClassName: string;
    bgClassName: string;
    onSave: (value: string) => Promise<void>;
}

function EditableNote({ icon, value, placeholder, textClassName, bgClassName, onSave }: EditableNoteProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [status, setStatus] = useState<SaveStatus>('idle');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 自動調整 textarea 高度
    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, []);

    // 進入編輯模式時立即調整高度
    useEffect(() => {
        if (editing) {
            // 等一幀確保 DOM 已渲染
            requestAnimationFrame(autoResize);
        }
    }, [editing, autoResize]);

    const triggerSave = useCallback(
        (val: string) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(async () => {
                setStatus('saving');
                try {
                    await onSave(val);
                    setStatus('saved');
                    setTimeout(() => setStatus('idle'), 2000);
                } catch {
                    setStatus('error');
                }
            }, 800);
        },
        [onSave]
    );

    const handleChange = (val: string) => {
        setDraft(val);
        autoResize();
        triggerSave(val);
    };

    const handleBlur = () => {
        setEditing(false);
    };

    if (editing) {
        return (
            <div className={`w-full rounded-xl border px-2.5 py-2 transition-all ${bgClassName}`}>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px]">{icon}</span>
                    <span className={`text-[11px] font-bold ${
                        status === 'saving' ? 'text-amber-500' :
                        status === 'saved'  ? 'text-emerald-500' :
                        status === 'error'  ? 'text-red-500' : 'text-slate-300'
                    }`}>
                        {status === 'saving' ? '儲存中…' : status === 'saved' ? '✓ 已儲存' : status === 'error' ? '✗ 失敗' : ''}
                    </span>
                </div>
                <textarea
                    ref={textareaRef}
                    autoFocus
                    value={draft}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    onFocus={autoResize}
                    rows={2}
                    placeholder={placeholder}
                    className={`w-full min-h-[36px] bg-transparent text-[13px] ${textClassName} leading-relaxed resize-none outline-none placeholder:text-slate-300 whitespace-pre-wrap overflow-hidden`}
                />
            </div>
        );
    }

    // read mode — click to edit
    return (
        <button
            type="button"
            onClick={() => setEditing(true)}
            className={`w-full text-left flex items-start gap-1.5 rounded-xl px-2.5 py-2 border transition-all group/note ${bgClassName} hover:brightness-95`}
        >
            <span className="text-[14px] shrink-0 mt-px">{icon}</span>
            {draft ? (
                <p className={`text-[13px] ${textClassName} leading-relaxed whitespace-pre-wrap break-words flex-1`}>
                    {draft}
                </p>
            ) : (
                <p className="text-[13px] text-slate-300 italic leading-relaxed flex-1">{placeholder}</p>
            )}
            <span className="text-[11px] text-slate-300 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0 mt-px">
                編輯
            </span>
        </button>
    );
}

// ── card ─────────────────────────────────────────────────────────────────────

interface CaseMemoCardProps {
    caseData: DemoCase;
}

export default function CaseMemoCard({ caseData }: CaseMemoCardProps) {
    const supabase = createClient();
    const milestone = caseData.milestones?.[0];
    const next = getNextMilestone(milestone);
    const pendingCount = countPendingTodos(caseData.todos);

    const cleanNotes = caseData.notes?.replace(/\[\[ATTR:.*?\]\]/g, '').trim() ?? '';
    // Preserve the [[ATTR:...]] suffix so custom attributes are not lost on save
    const attrSuffix = (() => {
        const match = caseData.notes?.match(/(\[\[ATTR:.*?\]\])/);
        return match ? `\n\n${match[1]}` : '';
    })();

    const save = useCallback(
        async (field: 'notes' | 'pending_tasks' | 'private_notes', value: string) => {
            const payload: Record<string, string> = {
                updated_at: new Date().toISOString(),
            };
            if (field === 'notes') {
                payload.notes = value ? `${value}${attrSuffix}` : attrSuffix.trim();
            } else {
                payload[field] = value;
            }
            const { error } = await supabase.from('cases').update(payload).eq('id', caseData.id);
            if (error) throw error;
        },
        [supabase, caseData.id, attrSuffix]
    );

    return (
        <div className="glass-card p-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <Link
                    href={`/cases/${caseData.id}`}
                    className="text-[15px] font-black text-blue-600 hover:text-blue-700 transition-colors"
                >
                    {caseData.case_number}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                    {pendingCount > 0 && (
                        <span className="text-[12px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20">
                            {pendingCount} 待辦
                        </span>
                    )}
                    {next && (
                        <span className="text-[12px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/20">
                            {next.label} {formatShortDate(next.date!)}
                        </span>
                    )}
                </div>
            </div>

            {/* Buyer / Seller */}
            <div className="text-[13px] text-slate-500 font-medium leading-tight">
                {caseData.buyer_name}
                <span className="mx-1 text-slate-300">/</span>
                {caseData.seller_name}
            </div>

            {/* ⚠️ 警示備註 */}
            <EditableNote
                icon="⚠️"
                value={cleanNotes}
                placeholder="新增警示備註…"
                textClassName="text-rose-600 dark:text-rose-400 font-bold"
                bgClassName="bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40"
                onSave={(v) => save('notes', v)}
            />

            {/* 📝 其他備忘 */}
            <EditableNote
                icon="📝"
                value={caseData.pending_tasks ?? ''}
                placeholder="新增代辦備忘…"
                textClassName="text-slate-600 dark:text-slate-400 italic"
                bgClassName="bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/40"
                onSave={(v) => save('pending_tasks', v)}
            />

            {/* 🔒 Private Notes */}
            <EditableNote
                icon="🔒"
                value={caseData.private_notes ?? ''}
                placeholder="新增私密備註…"
                textClassName="text-slate-600 dark:text-slate-400"
                bgClassName="bg-slate-100/80 dark:bg-slate-800/70 border-slate-300/60 dark:border-slate-600/40"
                onSave={(v) => save('private_notes', v)}
            />
        </div>
    );
}
