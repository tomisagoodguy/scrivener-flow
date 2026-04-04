'use client';

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import CaseTodos from '@/components/features/cases/CaseTodos';
import { DemoCase } from '@/types';
import { ALL_KNOWN_PREFIXES, OLD_STAGES, NEW_STAGES } from '@/lib/checklist/checklistData';

interface ChecklistSectionProps {
    initialData: DemoCase;
}

interface StageCount {
    completed: number;
    total: number;
}

const STORAGE_KEY = 'checklist_show_completed';
const DETAIL_STORAGE_KEY = 'checklist_show_detail';


// ─── 計算所有階段的初始狀態 ──────────────────────────────────────

const initCounts = (stages: readonly { key: string }[]) =>
    Object.fromEntries(stages.map((s) => [s.key, { completed: 0, total: 0 }]));

// ─── Component ───────────────────────────────────────────────────

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({ initialData }) => {
    const [showCompleted, setShowCompleted] = useState(() =>
        typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) !== 'false' : true
    );
    const [showDetail, setShowDetail] = useState(() =>
        typeof window !== 'undefined' ? localStorage.getItem(DETAIL_STORAGE_KEY) === 'true' : false
    );

    const [oldCounts, setOldCounts] = useState<Record<string, StageCount>>(initCounts(OLD_STAGES));
    const [newCounts, setNewCounts] = useState<Record<string, StageCount>>(initCounts(NEW_STAGES));

    const handleToggleCompleted = () => {
        const next = !showCompleted;
        setShowCompleted(next);
        localStorage.setItem(STORAGE_KEY, String(next));
    };

    const handleToggleDetail = () => {
        const next = !showDetail;
        setShowDetail(next);
        localStorage.setItem(DETAIL_STORAGE_KEY, String(next));
    };

    const makeOldCountHandler = useCallback(
        (stageKey: string) => (completed: number, total: number) => {
            setOldCounts((prev) => ({ ...prev, [stageKey]: { completed, total } }));
        },
        []
    );

    const makeNewCountHandler = useCallback(
        (stageKey: string) => (completed: number, total: number) => {
            setNewCounts((prev) => ({ ...prev, [stageKey]: { completed, total } }));
        },
        []
    );

    // 過濾掉歷史遺留的 legacy key
    const filteredTodos = React.useMemo(() => {
        const t = { ...(initialData.todos || {}) } as Record<string, boolean>;
        delete t['S_權狀印鑑'];
        delete t['S_稅單'];
        return t;
    }, [initialData.todos]);

    // 計算新版五階段整體進度
    const newTotal = Object.values(newCounts).reduce((s, c) => s + c.total, 0);
    const newCompleted = Object.values(newCounts).reduce((s, c) => s + c.completed, 0);

    return (
        <div className="space-y-3">
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-accent dark:text-white! border-l-4 border-accent pl-3">
                    辦事清單
                </h3>
                <button
                    type="button"
                    onClick={handleToggleCompleted}
                    className={`
                        flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold
                        border transition-all select-none shrink-0
                        ${showCompleted
                            ? 'border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 dark:border-white/20 dark:text-white/40 dark:hover:text-white/70'
                            : 'border-emerald-400/60 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500/40 dark:text-emerald-400'
                        }
                    `}
                    title={showCompleted ? '點擊以隱藏已完成事項' : '點擊以顯示全部事項'}
                >
                    {showCompleted ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{showCompleted ? '顯示已完成' : '隱藏已完成'}</span>
                </button>
            </div>

            {/* ── 舊版二階段（永遠展開）──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OLD_STAGES.map((stage) => {
                    const count = oldCounts[stage.key];
                    const isAllDone = count.total > 0 && count.completed === count.total;

                    return (
                        <div
                            key={stage.key}
                            className={`p-3 border rounded-xl ${stage.color} flex flex-col gap-1`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-[11px] font-black text-foreground/50 uppercase tracking-wide">
                                    {stage.label}
                                </h4>
                                {count.total > 0 && (
                                    <span
                                        className={`
                                            text-[10px] font-bold px-1.5 py-0.5 rounded-full border transition-colors shrink-0
                                            ${isAllDone
                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600'
                                                : `bg-white/40 border-current/20 ${stage.badge} opacity-80`
                                            }
                                        `}
                                    >
                                        {count.completed}/{count.total}
                                    </span>
                                )}
                            </div>
                            <CaseTodos
                                caseId={initialData.id}
                                initialTodos={filteredTodos}
                                items={stage.items as unknown as string[]}
                                hideCompleted={!showCompleted}
                                allowAdd={false}
                                prefix={stage.prefix}
                                catchUncategorized={false}
                                allKnownPrefixes={ALL_KNOWN_PREFIXES}
                                onCountChange={makeOldCountHandler(stage.key)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* ── 展開/收合按鈕（新版五階段）─────────────────────────── */}
            <button
                type="button"
                onClick={handleToggleDetail}
                className={`
                    w-full flex items-center justify-between gap-2
                    px-4 py-2.5 rounded-xl border text-[12px] font-bold
                    transition-all select-none cursor-pointer
                    ${showDetail
                        ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-500/20 dark:bg-blue-500 dark:border-blue-600'
                        : 'bg-slate-300 border-slate-400 text-slate-700 hover:bg-blue-500 hover:border-blue-600 hover:text-white hover:shadow-md hover:shadow-blue-500/20 dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-blue-500 dark:hover:border-blue-400 dark:hover:text-white dark:hover:shadow-blue-500/30'
                    }
                `}
            >
                <div className="flex items-center gap-2">
                    <ClipboardList size={14} />
                    <span>詳細五階段流程</span>
                    {newTotal > 0 && (
                        <span className={`
                            text-[10px] px-1.5 py-0.5 rounded-full border
                            ${newCompleted === newTotal
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-600'
                                : 'bg-blue-500/10 border-blue-300/40 text-blue-500'
                            }
                        `}>
                            {newCompleted}/{newTotal}
                        </span>
                    )}
                </div>
                {showDetail ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {/* ── 新版五階段（收合區塊）───────────────────────────────── */}
            {showDetail && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 animate-fade-in">
                    {NEW_STAGES.map((stage) => {
                        const count = newCounts[stage.key];
                        const isAllDone = count.total > 0 && count.completed === count.total;

                        return (
                            <div
                                key={stage.key}
                                className={`p-3 border rounded-xl ${stage.color} flex flex-col gap-1`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-[11px] font-black text-foreground/50 uppercase tracking-wide leading-tight">
                                        {stage.label}
                                    </h4>
                                    {count.total > 0 && (
                                        <span
                                            className={`
                                                text-[10px] font-bold px-1.5 py-0.5 rounded-full border transition-colors shrink-0
                                                ${isAllDone
                                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                                    : `bg-white/40 border-current/20 ${stage.badge} opacity-80`
                                                }
                                            `}
                                        >
                                            {count.completed}/{count.total}
                                        </span>
                                    )}
                                </div>
                                <CaseTodos
                                    caseId={initialData.id}
                                    initialTodos={filteredTodos}
                                    items={stage.items as unknown as string[]}
                                    hideCompleted={!showCompleted}
                                    allowAdd={true}
                                    prefix={stage.prefix}
                                    catchUncategorized={'catchUncategorized' in stage ? stage.catchUncategorized : false}
                                    allKnownPrefixes={ALL_KNOWN_PREFIXES}
                                    onCountChange={makeNewCountHandler(stage.key)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
