'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { caseService } from '@/services/caseService';
import { DemoCase, Milestone } from '@/types';
import { stripHtml } from './edit-case/caseUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getUrgencyClass(dateStr: string | null | undefined): string {
    if (!dateStr) return 'text-slate-400';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((new Date(dateStr).getTime() - today.getTime()) / 86400000);
    if (diff < 0) return 'text-rose-600 dark:text-rose-400 font-black';
    if (diff <= 2) return 'text-amber-600 dark:text-amber-400 font-black';
    return 'text-slate-500 dark:text-slate-400';
}

function MilestoneCell({ m }: { m: Milestone | undefined }) {
    if (!m) return <span className="text-slate-300 text-[11px]">—</span>;
    const steps = [
        { label: '印', date: m.seal_date },
        { label: '稅', date: m.tax_payment_date },
        { label: '過', date: m.transfer_date },
        { label: '交', date: m.handover_date },
    ];
    return (
        <div className="flex items-center gap-2">
            {steps.map(({ label, date }) =>
                date ? (
                    <span key={label} className={`text-[11px] tabular-nums whitespace-nowrap ${getUrgencyClass(date)}`}>
                        {label}<span className="opacity-70">{formatShortDate(date)}</span>
                    </span>
                ) : null
            )}
        </div>
    );
}

// ── inline editable note ──────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface InlineNoteProps {
    icon: string;
    value: string;
    placeholder: string;
    textClass: string;
    onSave: (v: string) => Promise<void>;
    /** 被分享者（非案件擁有者）唯讀檢視時傳入 true：點擊進入編輯模式的入口停用。 */
    readOnly?: boolean;
}

function InlineNote({ icon, value, placeholder, textClass, onSave, readOnly = false }: InlineNoteProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [status, setStatus] = useState<SaveStatus>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);

    const autoResize = useCallback((el: HTMLTextAreaElement | null = taRef.current) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, []);

    const triggerSave = useCallback((val: string) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            setStatus('saving');
            try {
                await onSave(val);
                setStatus('saved');
                setTimeout(() => setStatus('idle'), 1500);
            } catch {
                setStatus('error');
            }
        }, 700);
    }, [onSave]);

    if (editing && !readOnly) {
        return (
            <div className="flex items-start gap-1 w-full">
                <span className="text-[11px] shrink-0 mt-0.5 opacity-60">{icon}</span>
                <div className="flex-1 min-w-0">
                    <textarea
                        ref={(el) => { taRef.current = el; autoResize(el); if (el) el.focus(); }}
                        value={draft}
                        rows={1}
                        onChange={(e) => { setDraft(e.target.value); autoResize(); triggerSave(e.target.value); }}
                        onBlur={() => setEditing(false)}
                        placeholder={placeholder}
                        className={`w-full bg-transparent text-[11px] ${textClass} leading-snug resize-none outline-none placeholder:text-slate-300 whitespace-pre-wrap overflow-hidden`}
                    />
                    {status !== 'idle' && (
                        <span className={`text-[10px] font-bold ${
                            status === 'saving' ? 'text-amber-500' :
                            status === 'saved'  ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                            {status === 'saving' ? '儲存中…' : status === 'saved' ? '✓' : '✗'}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => !readOnly && setEditing(true)}
            disabled={readOnly}
            className={`flex items-start gap-1 w-full text-left group/note transition-opacity ${readOnly ? '' : 'hover:opacity-80'}`}
        >
            <span className="text-[11px] shrink-0 mt-0.5 opacity-60">{icon}</span>
            {draft ? (
                <p className={`text-[11px] ${textClass} leading-snug whitespace-pre-wrap break-words flex-1`}>{draft}</p>
            ) : (
                <p className="text-[11px] text-slate-300 italic leading-snug opacity-0 group-hover/note:opacity-100 transition-opacity flex-1">
                    {placeholder}
                </p>
            )}
        </button>
    );
}

// ── row ───────────────────────────────────────────────────────────────────────

function CaseMemoListRow({ c }: { c: DemoCase }) {
    const supabase = createClient();
    const milestone = c.milestones?.[0];

    const cleanNotes = stripHtml(c.notes?.replace(/\[\[ATTR:.*?\]\]/g, '').trim() ?? '');
    const attrSuffix = (() => {
        const match = c.notes?.match(/(\[\[ATTR:.*?\]\])/);
        return match ? `\n\n${match[1]}` : '';
    })();
    const pendingTasks = stripHtml(c.pending_tasks ?? '').trim();
    const privateNotes = stripHtml(c.private_notes ?? '').trim();

    const save = useCallback(
        async (field: 'notes' | 'pending_tasks' | 'private_notes', value: string) => {
            await caseService.updateCaseMemo(supabase, c.id, field, value, attrSuffix);
        },
        [supabase, c.id, attrSuffix]
    );

    return (
        <div
            className="grid items-start gap-0 px-3 border-b border-slate-100/70 dark:border-slate-800/30 hover:bg-blue-500/5 transition-colors py-1.5"
            style={{ gridTemplateColumns: '100px 160px 200px 1fr' }}
        >
            {/* 案號 */}
            <Link
                href={`/cases/${c.id}`}
                className="text-[12px] font-black text-blue-600 hover:text-blue-700 hover:underline transition-colors pr-2 pt-0.5"
            >
                {c.case_number}
            </Link>

            {/* 買方 / 賣方 */}
            <div className="text-[11px] text-slate-600 dark:text-slate-300 pr-2 leading-snug pt-0.5">
                <span className="font-medium">{c.buyer_name}</span>
                {c.seller_name && (
                    <span className="text-slate-400 before:content-['/'] before:mx-0.5">{c.seller_name}</span>
                )}
            </div>

            {/* 里程碑 */}
            <div className="pr-2 pt-0.5">
                <MilestoneCell m={milestone} />
            </div>

            {/* 三種備註 — 可編輯 */}
            <div className="flex flex-col gap-1 min-w-0">
                <InlineNote
                    icon="⚠"
                    value={cleanNotes}
                    placeholder="應注意備註…"
                    textClass="text-rose-600 dark:text-rose-400 font-medium"
                    onSave={(v) => save('notes', v)}
                    readOnly={c.isOwnedByCurrentUser === false}
                />
                <InlineNote
                    icon="📝"
                    value={pendingTasks}
                    placeholder="其他代辦…"
                    textClass="text-slate-500 dark:text-slate-400"
                    onSave={(v) => save('pending_tasks', v)}
                    readOnly={c.isOwnedByCurrentUser === false}
                />
                <InlineNote
                    icon="🔒"
                    value={privateNotes}
                    placeholder="私密備註…"
                    textClass="text-slate-400 dark:text-slate-500"
                    onSave={(v) => save('private_notes', v)}
                    readOnly={c.isOwnedByCurrentUser === false}
                />
            </div>
        </div>
    );
}

// ── list ──────────────────────────────────────────────────────────────────────

interface CaseMemoListViewProps {
    cases: DemoCase[];
}

export default function CaseMemoListView({ cases }: CaseMemoListViewProps) {
    if (cases.length === 0) {
        return (
            <div className="glass-card p-16 text-center">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-slate-400 font-bold">目前沒有案件</p>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden border-none shadow-xl shadow-slate-200/40 dark:shadow-none">
            {/* Header */}
            <div
                className="grid gap-0 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/80 dark:bg-slate-950/30 px-3 py-2"
                style={{ gridTemplateColumns: '100px 160px 200px 1fr' }}
            >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">案號</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">買方 / 賣方</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">印 稅 過 交</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">備註（點擊編輯）</span>
            </div>

            {cases.map((c) => <CaseMemoListRow key={c.id} c={c} />)}
        </div>
    );
}
