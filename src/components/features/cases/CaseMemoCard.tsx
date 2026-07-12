'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { caseService } from '@/services/caseService';
import { DemoCase, Milestone, TodoRecord } from '@/types';
import { stripHtml } from './edit-case/caseUtils';
import ChatGroupsEditor from './ChatGroupsEditor';

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

    const upcoming = steps
        .map((s, idx) => ({ ...s, idx }))
        .filter((s) => s.date)
        .map((s) => ({ ...s, time: new Date(s.date!).getTime() }))
        .filter((s) => s.time >= today.getTime())
        .sort((a, b) => a.time - b.time)[0];

    if (!upcoming) return null;

    // 決定「下一站」提示
    const next = steps[upcoming.idx + 1];
    let hint: string | null = null;
    let hintDate: string | null = null;
    let hintWarn = false;

    if (next) {
        if (next.date) {
            hint = next.label;
            hintDate = next.date;
        } else if (next.label === '過') {
            // 過沒有日期 → 提醒設定交
            const handover = steps[upcoming.idx + 2];
            hint = '交';
            hintDate = handover?.date ?? null;
            hintWarn = true;
        } else {
            hint = next.label;
            hintWarn = true;
        }
    }

    return { label: upcoming.label, date: upcoming.date, hint, hintDate, hintWarn };
}

function formatShortDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function countPendingTodos(todos: Record<string, boolean> | undefined) {
    if (!todos) return 0;
    return Object.values(todos).filter((v) => !v).length;
}

function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    const hasTime = h !== 0 || min !== '00';
    return hasTime ? `${m}/${day} ${h}:${min}` : `${m}/${day}`;
}

type Urgency = 'overdue' | 'urgent' | 'soon' | 'upcoming';

function getUrgency(dateStr: string | null | undefined): Urgency | null {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((new Date(dateStr).getTime() - today.getTime()) / 86400000);
    if (diff < 0) return 'overdue';
    if (diff <= 2) return 'urgent';
    if (diff <= 7) return 'soon';
    return 'upcoming';
}

const urgencyChipStyle: Record<Urgency, string> = {
    overdue:  'bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40 text-rose-600 dark:text-rose-400',
    urgent:   'bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400',
    soon:     'bg-blue-50 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-400',
    upcoming: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/40 text-slate-500 dark:text-slate-400',
};

function DateChip({ label, dateStr }: { label: string; dateStr: string }) {
    const urgency = getUrgency(dateStr);
    if (!urgency) return null;
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${urgencyChipStyle[urgency]}`}>
            {urgency === 'overdue' && <span>🔴</span>}
            {urgency === 'urgent'  && <span>🟠</span>}
            <span>{label}</span>
            <span className="font-normal opacity-80">{formatDateTime(dateStr)}</span>
        </span>
    );
}

function ImportantDates({ milestone, financials }: { milestone?: Milestone; financials?: import('@/types').Financials }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFuture = (d: string | null | undefined) => !!d && new Date(d) >= today;

    const appointments = [
        { label: '簽約約', date: milestone?.sign_appointment },
        { label: '用印約', date: milestone?.seal_appointment },
        { label: '完稅約', date: milestone?.tax_appointment },
        { label: '交屋約', date: milestone?.handover_appointment },
    ].filter((a) => isFuture(a.date));

    const taxDeadlines = [
        { label: '地增稅', date: financials?.land_value_tax_deadline },
        { label: '契稅', date: financials?.deed_tax_deadline },
        { label: '土地稅', date: financials?.land_tax_deadline },
        { label: '房屋稅', date: financials?.house_tax_deadline },
    ].filter((t) => !!t.date);

    if (appointments.length === 0 && taxDeadlines.length === 0) return null;

    return (
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30">
            {appointments.length > 0 && (
                <div className="flex items-start gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">🤝</span>
                    {appointments.map((a) => <DateChip key={a.label} label={a.label} dateStr={a.date!} />)}
                </div>
            )}
            {taxDeadlines.length > 0 && (
                <div className="flex items-start gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">🧾</span>
                    {taxDeadlines.map((t) => <DateChip key={t.label} label={t.label} dateStr={t.date!} />)}
                </div>
            )}
        </div>
    );
}

function formatDueDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isPast = d < now && !isToday;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const hasTime = hours !== 0 || minutes !== '00';
    const dateLabel = isToday ? '今天' : `${month}/${day}`;
    const timeLabel = hasTime ? ` ${hours}:${minutes}` : '';
    return { label: `${dateLabel}${timeLabel}`, isPast, isToday };
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
    /** 被分享者（非案件擁有者）唯讀檢視時傳入 true：點擊進入編輯模式的入口停用。 */
    readOnly?: boolean;
}

function EditableNote({ icon, value, placeholder, textClassName, bgClassName, onSave, readOnly = false }: EditableNoteProps) {
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

    if (editing && !readOnly) {
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

    // read mode — click to edit（唯讀分享情境下不可點擊進入編輯）
    return (
        <button
            type="button"
            onClick={() => !readOnly && setEditing(true)}
            disabled={readOnly}
            className={`w-full text-left flex items-start gap-1.5 rounded-xl px-2.5 py-2 border transition-all group/note ${bgClassName} ${readOnly ? '' : 'hover:brightness-95'}`}
        >
            <span className="text-[14px] shrink-0 mt-px">{icon}</span>
            {draft ? (
                <p className={`text-[13px] ${textClassName} leading-relaxed whitespace-pre-wrap wrap-break-word flex-1`}>
                    {draft}
                </p>
            ) : (
                <p className="text-[13px] text-slate-300 italic leading-relaxed flex-1">{placeholder}</p>
            )}
            {!readOnly && (
                <span className="text-[11px] text-slate-300 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0 mt-px">
                    編輯
                </span>
            )}
        </button>
    );
}

// ── scroll helper ─────────────────────────────────────────────────────────────

function scrollToCase(id: string) {
    const el = document.getElementById(`case-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-4', 'ring-blue-500/40', 'scale-[1.01]', 'shadow-2xl');
    setTimeout(() => {
        el.classList.remove('ring-4', 'ring-blue-500/40', 'scale-[1.01]', 'shadow-2xl');
    }, 2000);
}

// ── card ─────────────────────────────────────────────────────────────────────

interface CaseMemoCardProps {
    caseData: DemoCase;
    allCases: DemoCase[];
    currentIndex: number;
    view?: string;
}

export default function CaseMemoCard({ caseData, allCases, currentIndex, view = 'all' }: CaseMemoCardProps) {
    const supabase = createClient();
    const milestone = caseData.milestones?.[0];
    const next = getNextMilestone(milestone);
    const pendingCount = countPendingTodos(caseData.todos);

    const financials = caseData.financials?.[0];
    const REMOVED_SYSTEM_KEYS = new Set([
        'seal_date', 'tax_payment_date', 'transfer_date', 'handover_date', 'tax_filing_reminder', 'sign_diff_date',
    ]);
    const activeTodos: TodoRecord[] = (caseData.todos_list ?? []).filter(
        (t) => !t.is_completed && !t.is_deleted && !REMOVED_SYSTEM_KEYS.has(t.source_key ?? '')
    );
    const [todosOpen, setTodosOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const prevCase = currentIndex > 0 ? allCases[currentIndex - 1] : null;
    const nextCase = currentIndex < allCases.length - 1 ? allCases[currentIndex + 1] : null;

    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    const cleanNotes = stripHtml(caseData.notes?.replace(/\[\[ATTR:.*?\]\]/g, '').trim() ?? '');
    // Preserve the [[ATTR:...]] suffix so custom attributes are not lost on save
    const attrSuffix = (() => {
        const match = caseData.notes?.match(/(\[\[ATTR:.*?\]\])/);
        return match ? `\n\n${match[1]}` : '';
    })();

    const save = useCallback(
        async (field: 'notes' | 'pending_tasks' | 'private_notes', value: string) => {
            await caseService.updateCaseMemo(supabase, caseData.id, field, value, attrSuffix);
        },
        [supabase, caseData.id, attrSuffix]
    );

    return (
        <div id={`case-${caseData.id}`} className="glass-card p-4 flex flex-col gap-3 transition-all duration-500 scroll-mt-[170px]">
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
                        <span className="flex items-center gap-1 text-[12px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/20">
                            <span>{next.label} {formatShortDate(next.date!)}</span>
                            {next.hint && (
                                <>
                                    <span className="text-blue-300">→</span>
                                    <span className={next.hintWarn ? 'text-amber-500' : 'text-blue-400'}>
                                        {next.hintWarn ? '⚠️' : ''}{next.hint}{next.hintDate ? ` ${formatShortDate(next.hintDate)}` : ''}
                                    </span>
                                </>
                            )}
                        </span>
                    )}
                    {/* D: N/M badge + dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setDropdownOpen((o) => !o)}
                            className="text-[11px] font-bold text-slate-400 hover:text-blue-600 px-2 py-0.5 rounded-full hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-500/20"
                        >
                            {currentIndex + 1} / {allCases.length}
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                                {allCases.map((c, i) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => { scrollToCase(c.id); setDropdownOpen(false); }}
                                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2 ${
                                            i === currentIndex
                                                ? 'text-blue-600 font-bold bg-blue-500/5'
                                                : 'text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        <span className="text-slate-400 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                                        <span className="font-bold truncate">{c.case_number}</span>
                                        <span className="text-slate-400 truncate text-[11px]">{c.buyer_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Buyer / Seller */}
            <div className="text-[13px] text-slate-500 font-medium leading-tight">
                {caseData.buyer_name}
                <span className="mx-1 text-slate-300">/</span>
                {caseData.seller_name}
            </div>

            {/* 重要時程 */}
            <ImportantDates milestone={milestone} financials={financials} />

            {/* 待辦清單 */}
            {activeTodos.length > 0 && (
                <div className="flex flex-col gap-1">
                    <button
                        type="button"
                        onClick={() => setTodosOpen((o) => !o)}
                        className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors text-left"
                    >
                        <span className={`transition-transform duration-200 ${todosOpen ? 'rotate-90' : ''}`}>▶</span>
                        待辦 {activeTodos.length} 項
                    </button>
                    {todosOpen && activeTodos.map((todo) => {
                        const due = todo.due_date ? formatDueDate(todo.due_date) : null;
                        return (
                            <div
                                key={todo.id}
                                className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40"
                            >
                                <span className="text-[12px] shrink-0 mt-px">☐</span>
                                <span className="text-[13px] text-slate-700 dark:text-slate-300 flex-1 leading-snug">
                                    {todo.content}
                                </span>
                                {due && (
                                    <span
                                        className={`text-[11px] font-bold whitespace-nowrap shrink-0 mt-px ${
                                            due.isPast
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : due.isToday
                                                  ? 'text-amber-600 dark:text-amber-400'
                                                  : 'text-slate-400'
                                        }`}
                                    >
                                        {due.label}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ⚠️ 警示備註 */}
            {(view === 'all' || view === 'notes') && (
                <EditableNote
                    icon="⚠️"
                    value={cleanNotes}
                    placeholder="新增警示備註…"
                    textClassName="text-rose-600 dark:text-rose-400 font-bold"
                    bgClassName="bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40"
                    onSave={(v) => save('notes', v)}
                    readOnly={caseData.isOwnedByCurrentUser === false}
                />
            )}

            {/* 📝 其他備忘 */}
            {(view === 'all' || view === 'pending') && (
                <EditableNote
                    icon="📝"
                    value={stripHtml(caseData.pending_tasks ?? '')}
                    placeholder="新增代辦備忘…"
                    textClassName="text-slate-600 dark:text-slate-400 italic"
                    bgClassName="bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/40"
                    onSave={(v) => save('pending_tasks', v)}
                    readOnly={caseData.isOwnedByCurrentUser === false}
                />
            )}

            {/* 🔒 Private Notes */}
            {(view === 'all' || view === 'private') && (
                <EditableNote
                    icon="🔒"
                    value={stripHtml(caseData.private_notes ?? '')}
                    placeholder="新增私密備註…"
                    textClassName="text-slate-600 dark:text-slate-400"
                    bgClassName="bg-slate-100/80 dark:bg-slate-800/70 border-slate-300/60 dark:border-slate-600/40"
                    onSave={(v) => save('private_notes', v)}
                    readOnly={caseData.isOwnedByCurrentUser === false}
                />
            )}

            {/* 📱 通訊群組 */}
            {view === 'all' && (
                <ChatGroupsEditor
                    caseId={caseData.id}
                    initialGroups={caseData.chat_groups ?? {}}
                    readOnly={caseData.isOwnedByCurrentUser === false}
                />
            )}

            {/* A: Prev / Next navigation */}
            {(prevCase || nextCase) && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    {prevCase ? (
                        <button
                            type="button"
                            onClick={() => scrollToCase(prevCase.id)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 transition-colors group/nav max-w-[45%]"
                        >
                            <span className="shrink-0">←</span>
                            <span className="truncate group-hover/nav:text-blue-600">
                                {prevCase.case_number}
                            </span>
                        </button>
                    ) : <div />}
                    {nextCase ? (
                        <button
                            type="button"
                            onClick={() => scrollToCase(nextCase.id)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 transition-colors group/nav max-w-[45%]"
                        >
                            <span className="truncate group-hover/nav:text-blue-600">
                                {nextCase.case_number}
                            </span>
                            <span className="shrink-0">→</span>
                        </button>
                    ) : <div />}
                </div>
            )}
        </div>
    );
}
