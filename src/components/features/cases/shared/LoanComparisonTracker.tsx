'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface BankEstimate {
    id: string;
    bankName: string;
    rate: string;
    amount: string;
    term: string;
    status: 'Estimated' | 'Applied' | 'Approved' | 'Final';
    notes: string;
}

interface LoanComparisonTrackerProps {
    initialValue?: string; // JSON string of BankEstimate[]
    onFinalBankSelect?: (bankName: string) => void;
    fieldName?: string;
}

export function LoanComparisonTracker({ initialValue, onFinalBankSelect, fieldName = 'loan_estimates_json' }: LoanComparisonTrackerProps) {
    const [estimates, setEstimates] = useState<BankEstimate[]>([]);

    useEffect(() => {
        if (initialValue) {
            try {
                const parsed = JSON.parse(initialValue);
                if (Array.isArray(parsed)) {
                    setEstimates(parsed);
                }
            } catch (e) {
                console.error('Failed to parse loan estimates', e);
            }
        }
    }, [initialValue]);

    const addEstimate = () => {
        const newEstimate: BankEstimate = {
            id: crypto.randomUUID(),
            bankName: '',
            rate: '',
            amount: '',
            term: '',
            status: 'Estimated',
            notes: ''
        };
        setEstimates([...estimates, newEstimate]);
    };

    const updateEstimate = (id: string, updates: Partial<BankEstimate>) => {
        setEstimates(estimates.map(est => est.id === id ? { ...est, ...updates } : est));
    };

    const removeEstimate = (id: string) => {
        setEstimates(estimates.filter(est => est.id !== id));
    };

    const setFinal = (id: string) => {
        const updated = estimates.map(est => ({
            ...est,
            status: (est.id === id ? 'Final' : (est.status === 'Final' ? 'Approved' : est.status)) as BankEstimate['status']
        }));
        setEstimates(updated);

        const finalBank = updated.find(e => e.id === id);
        if (finalBank && onFinalBankSelect) {
            onFinalBankSelect(finalBank.bankName);
        }
    };

    return (
        <div className="mt-4 space-y-3 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">銀行估值追蹤</span>
                </div>
                <button
                    type="button"
                    onClick={addEstimate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[11px] font-black rounded-lg border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
                >
                    <Plus className="w-3.5 h-3.5" />
                    新增估值
                </button>
            </div>

            <div className="space-y-2">
                {estimates.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-white/30">
                        <p className="text-[11px] font-medium italic">尚未輸入任何資訊。點擊上方「新增估值」開始紀錄多家銀行條件。</p>
                    </div>
                ) : (
                    estimates.map((est) => (
                        <div
                            key={est.id}
                            className={`flex flex-col md:flex-row items-start md:items-center gap-3 p-3 rounded-2xl transition-all border ${est.status === 'Final'
                                    ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800 shadow-sm'
                                    : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800 hover:border-slate-200 shadow-sm'
                                }`}
                        >
                            {/* 成交按鈕 */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setFinal(est.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${est.status === 'Final'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800'
                                        }`}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {est.status === 'Final' ? '成交' : '標記成交'}
                                </button>

                                <div className="md:hidden flex-1 border-t border-slate-100 dark:border-slate-800"></div>

                                <button
                                    type="button"
                                    onClick={() => removeEstimate(est.id)}
                                    className="md:hidden p-2 text-slate-300 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* 輸入區塊 - 銀行與條件 */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1 w-full">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block md:hidden">銀行名稱</label>
                                    <input
                                        type="text"
                                        value={est.bankName}
                                        onChange={(e) => updateEstimate(est.id, { bankName: e.target.value })}
                                        placeholder="銀行/分行"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-sm font-black text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block md:hidden">利率 (%)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={est.rate}
                                            onChange={(e) => updateEstimate(est.id, { rate: e.target.value })}
                                            placeholder="利率"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg pl-3 pr-6 py-2 text-sm font-bold text-indigo-600 text-center focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block md:hidden">額度 (萬)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={est.amount}
                                            onChange={(e) => updateEstimate(est.id, { amount: e.target.value })}
                                            placeholder="額度"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg pl-3 pr-6 py-2 text-sm font-black text-slate-700 dark:text-slate-200 text-center focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">萬</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block md:hidden">年限</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={est.term}
                                            onChange={(e) => updateEstimate(est.id, { term: e.target.value })}
                                            placeholder="年限"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg pl-3 pr-6 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 text-center focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">年</span>
                                    </div>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block md:hidden">備註條款</label>
                                    <input
                                        type="text"
                                        value={est.notes}
                                        onChange={(e) => updateEstimate(est.id, { notes: e.target.value })}
                                        placeholder="備註 (如：寬限期)"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>

                            {/* 桌面版刪除按鈕 */}
                            <button
                                type="button"
                                onClick={() => removeEstimate(est.id)}
                                className="hidden md:block p-2 text-slate-200 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <input type="hidden" name={fieldName} value={JSON.stringify(estimates)} />
        </div>
    );
}
