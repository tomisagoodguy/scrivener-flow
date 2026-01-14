'use client';

import React, { useState } from 'react';
import { calculateMilestoneDates } from '@/utils/dateCalculator';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isWeekend, addMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Milestone {
    date: Date;
    label: string;
    color: string;
    bg: string;
}

const WeekHeader = () => (
    <div className="grid grid-cols-7 mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <div key={i} className={`text-center text-[10px] font-bold ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-400'}`}>
                {d}
            </div>
        ))}
    </div>
);

const MonthCalendar = ({ monthStart, milestones }: { monthStart: Date, milestones: Milestone[] }) => {
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 pl-1 border-l-4 border-purple-500">
                {format(monthStart, 'yyyy 年 M 月')}
            </h4>
            <WeekHeader />
            <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
                {days.map((day, idx) => {
                    const isCurrMonth = day.getMonth() === monthStart.getMonth();
                    const isSatSun = isWeekend(day);
                    const milestone = milestones.find(m => isSameDay(m.date, day));

                    return (
                        <div key={idx} className={`relative flex flex-col items-center justify-center p-1 rounded-lg min-h-[36px] transition-all border
                            ${!isCurrMonth ? 'opacity-20 grayscale border-transparent' : 'opacity-100'}
                            ${milestone
                                ? `${milestone.bg} border-transparent`
                                : isSatSun
                                    ? 'bg-red-50 border-red-100 text-red-900/50'
                                    : 'bg-white border-blue-50 text-gray-700 hover:bg-blue-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600'
                            }
                        `}>
                            <span className={`text-xs font-medium z-10 ${milestone ? 'text-white' : isSatSun ? 'text-red-400' : 'text-gray-600'}`}>
                                {format(day, 'd')}
                            </span>
                            {milestone && (
                                <span className="text-[8px] leading-none text-white font-bold truncate w-full text-center mt-0.5 px-0.5">
                                    {milestone.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function DashboardDateCalculator() {
    const [contractDate, setContractDate] = useState('');
    const [taxType, setTaxType] = useState<'一般' | '自用'>('一般');
    const [result, setResult] = useState<{
        sign_diff_date: string;
        seal_date: string;
        tax_payment_date: string;
        handover_date: string;
    } | null>(null);

    const handleCalculate = () => {
        if (!contractDate) return;
        const res = calculateMilestoneDates(contractDate, taxType);
        if (res) {
            setResult(res);
        }
    };

    // Prepare calendar data
    let calendarMonths: Date[] = [];
    let milestones: Milestone[] = [];

    if (result && contractDate) {
        const start = parseISO(contractDate);
        const end = parseISO(result.handover_date);

        // Generate months from contract to handover
        const months = eachDayOfInterval({
            start: startOfMonth(start),
            end: endOfMonth(end)
        });

        // Filter to get only the first day of each month to render MonthCalendar
        calendarMonths = months
            .filter(d => d.getDate() === 1);

        milestones = [
            { date: parseISO(contractDate), label: '簽約', color: 'text-blue-600', bg: 'bg-blue-500 shadow-blue-200 shadow-sm' },
            { date: parseISO(result.sign_diff_date), label: '補差', color: 'text-indigo-600', bg: 'bg-indigo-500 shadow-indigo-200 shadow-sm' },
            { date: parseISO(result.seal_date), label: '用印', color: 'text-purple-600', bg: 'bg-purple-500 shadow-purple-200 shadow-sm' },
            { date: parseISO(result.tax_payment_date), label: '完稅', color: 'text-pink-600', bg: 'bg-pink-500 shadow-pink-200 shadow-sm' },
            { date: parseISO(result.handover_date), label: '交屋', color: 'text-emerald-600', bg: 'bg-emerald-500 shadow-emerald-200 shadow-sm' },
        ];
    }

    return (
        <div className="flex flex-col h-full bg-card dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 transition-all">
            {/* Toolbar Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">進度日期推算</h2>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-white dark:bg-slate-900">
                <div className="space-y-6">
                    {/* User Selection */}
                    <div className="bg-gray-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-gray-100 dark:border-slate-800">
                        <div className="mb-6">
                            <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">簽約日期</label>
                            <input
                                type="date"
                                value={contractDate}
                                onChange={(e) => setContractDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none transition-all font-bold text-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                            <button
                                onClick={() => setTaxType('一般')}
                                className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${taxType === '一般' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}
                            >
                                一般稅單
                            </button>
                            <button
                                onClick={() => setTaxType('自用')}
                                className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${taxType === '自用' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}
                            >
                                自用稅單
                            </button>
                        </div>

                        <button
                            onClick={handleCalculate}
                            disabled={!contractDate}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl py-4 mt-6 font-black shadow-lg shadow-purple-200 dark:shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            ⚡ 開始推算
                        </button>
                    </div>

                    {result && (
                        <div className="animate-fade-in">
                            <div className="bg-gray-50 dark:bg-slate-950/40 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden mb-6">
                                <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-slate-800">
                                    <div className="p-4">
                                        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">簽約後補差額</div>
                                        <div className="font-bold text-indigo-600 dark:text-indigo-400">{result.sign_diff_date}</div>
                                    </div>
                                    <div className="p-4 border-t-0">
                                        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">用印日期 (約2月)</div>
                                        <div className="font-bold text-purple-600 dark:text-purple-400">{result.seal_date}</div>
                                    </div>
                                    <div className="p-4 border-l-0">
                                        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">預計完稅日</div>
                                        <div className="font-bold text-pink-500 dark:text-pink-400">{result.tax_payment_date}</div>
                                    </div>
                                    <div className="p-4">
                                        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">預計交屋日</div>
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{result.handover_date}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Calendar */}
                            <div className="space-y-6">
                                {calendarMonths.map((m, i) => (
                                    <MonthCalendar key={i} monthStart={m} milestones={milestones} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
