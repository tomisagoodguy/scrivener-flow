'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Banknote } from 'lucide-react';
import { REDEMPTION_STEPS } from '@/lib/constants/caseConstants';
import {
    initRedemptionSteps,
    getRedemptionSteps,
    updateRedemptionStep,
} from '@/app/actions/redemptionSteps';
import type { RedemptionStep } from '@/types';

interface Props {
    caseId: string;
}

export function RedemptionProgressTracker({ caseId }: Props) {
    const [steps, setSteps] = useState<RedemptionStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [, startTransition] = useTransition();

    useEffect(() => {
        async function load() {
            setLoading(true);
            const initResult = await initRedemptionSteps(caseId);
            if (initResult.error) {
                console.error('initRedemptionSteps failed:', initResult.error);
            }
            const { data, error: fetchError } = await getRedemptionSteps(caseId);
            if (fetchError) {
                console.error('getRedemptionSteps failed:', fetchError);
            }
            setSteps(data ?? []);
            setLoading(false);
        }
        load();
    }, [caseId]);

    const doneCount = steps.filter(s => s.is_done).length;

    function handleToggle(step: RedemptionStep) {
        const newIsDone = !step.is_done;
        setSteps(prev =>
            prev.map(s => (s.id === step.id ? { ...s, is_done: newIsDone } : s))
        );
        startTransition(async () => {
            await updateRedemptionStep(step.id, { is_done: newIsDone });
        });
    }

    function handleNoteChange(step: RedemptionStep, note: string) {
        setSteps(prev =>
            prev.map(s => (s.id === step.id ? { ...s, note: note || null } : s))
        );
    }

    function handleNoteBlur(step: RedemptionStep, note: string) {
        startTransition(async () => {
            await updateRedemptionStep(step.id, { note: note || null });
        });
    }

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header — 點擊收合 */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-orange-50/40 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {expanded ? (
                        <ChevronDown className="w-4 h-4 text-orange-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-orange-400" />
                    )}
                    <Banknote className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-orange-600 border-l-4 border-orange-400 pl-2">代償進度追蹤</span>
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    !loading && doneCount === 7
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                }`}>
                    {loading ? '—' : `${doneCount} / 7`} 步驟完成
                </span>
            </button>

            {/* 步驟列表 */}
            {expanded && (
                <div className="px-5 pb-4 space-y-2">
                    {loading ? (
                        <p className="text-sm text-foreground/40 py-2">載入中...</p>
                    ) : (
                        REDEMPTION_STEPS.map(def => {
                            const step = steps.find(s => s.step_number === def.step_number);
                            const isDone = step?.is_done ?? false;

                            return (
                                <div
                                    key={def.step_number}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                                        isDone ? 'bg-green-50/60' : 'bg-white/30'
                                    }`}
                                >
                                    {/* 勾選框 */}
                                    <button
                                        type="button"
                                        onClick={() => step && handleToggle(step)}
                                        className="shrink-0"
                                        disabled={!step}
                                    >
                                        {isDone ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-foreground/30" />
                                        )}
                                    </button>

                                    {/* 步驟名稱 */}
                                    <span
                                        className={`w-44 shrink-0 text-sm ${
                                            isDone ? 'line-through text-foreground/40' : 'text-foreground'
                                        }`}
                                    >
                                        <span className="text-foreground/40 mr-1">{def.step_number}.</span>
                                        {def.label}
                                    </span>

                                    {/* 備註輸入 */}
                                    <input
                                        type="text"
                                        placeholder="備註..."
                                        defaultValue={step?.note ?? ''}
                                        onBlur={e => step && handleNoteBlur(step, e.target.value)}
                                        onChange={e => step && handleNoteChange(step, e.target.value)}
                                        className="flex-1 text-sm bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded px-2 py-1 outline-none placeholder:text-foreground/30"
                                        disabled={!step}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
