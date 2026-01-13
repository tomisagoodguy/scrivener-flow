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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 border border-purple-100 rounded-xl text-purple-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">流程日期試算</h3>
                </div>
            </div>

            <div className="p-5 overflow-y-auto scrollbar-hide flex-1">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">簽約日期</label>
                        <input
                            type="date"
                            value={contractDate}
                            onChange={(e) => setContractDate(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer group flex-1 justify-center">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${taxType === '一般' ? 'border-purple-600' : 'border-gray-400 bg-white'}`}>
                                {taxType === '一般' && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />}
                            </div>
                            <input
                                type="radio"
                                name="dashboard_tax_type"
                                className="hidden"
                                checked={taxType === '一般'}
                                onChange={() => setTaxType('一般')}
                            />
                            <span className={`text-sm font-bold ${taxType === '一般' ? 'text-gray-900' : 'text-gray-500'}`}>一般稅單</span>
                        </label>
                        <div className="w-px h-6 bg-gray-300"></div>
                        <label className="flex items-center gap-2 cursor-pointer group flex-1 justify-center">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${taxType === '自用' ? 'border-purple-600' : 'border-gray-400 bg-white'}`}>
                                {taxType === '自用' && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />}
                            </div>
                            <input
                                type="radio"
                                name="dashboard_tax_type"
                                className="hidden"
                                checked={taxType === '自用'}
                                onChange={() => setTaxType('自用')}
                            />
                            <span className={`text-sm font-bold ${taxType === '自用' ? 'text-gray-900' : 'text-gray-500'}`}>自用稅單</span>
                        </label>
                    </div>

                    <button
                        onClick={handleCalculate}
                        disabled={!contractDate}
                        className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span>⚡</span> 開始推算
                    </button>

                    {result && (
                        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                            {/* Text Summary */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                                <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                                    <div className="p-3">
                                        <div className="text-xs text-gray-500 mb-1">補差額</div>
                                        <div className="font-bold text-indigo-600">{result.sign_diff_date}</div>
                                    </div>
                                    <div className="p-3">
                                        <div className="text-xs text-gray-500 mb-1">用印 (2月)</div>
                                        <div className="font-bold text-purple-600">{result.seal_date}</div>
                                    </div>
                                    <div className="p-3">
                                        <div className="text-xs text-gray-500 mb-1">完稅</div>
                                        <div className="font-bold text-pink-600">{result.tax_payment_date}</div>
                                    </div>
                                    <div className="p-3">
                                        <div className="text-xs text-gray-500 mb-1">交屋</div>
                                        <div className="font-bold text-emerald-600">{result.handover_date}</div>
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
