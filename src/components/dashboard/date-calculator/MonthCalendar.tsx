'use client';

import React from 'react';
import {
    format,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isWeekend,
    startOfWeek,
    endOfWeek,
} from 'date-fns';
import { getHolidayByDate, getHolidayColor } from '@/utils/publicHolidays';

interface Milestone {
    date: Date;
    label: string;
    color: string;
    bg: string;
}

const WeekHeader = () => (
    <div className="grid grid-cols-7 mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <div
                key={i}
                className={`text-center text-[10px] font-bold ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-400'}`}
            >
                {d}
            </div>
        ))}
    </div>
);

interface MonthCalendarProps {
    monthStart: Date;
    milestones: Milestone[];
}

export function MonthCalendar({ monthStart, milestones }: MonthCalendarProps) {
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
                    const milestone = milestones.find((m) => isSameDay(m.date, day));
                    const holiday = getHolidayByDate(day); // 取得政府假期

                    // 假期優先於一般 milestone
                    const displayHoliday = holiday && isCurrMonth;
                    const displayMilestone = milestone && !holiday && isCurrMonth;

                    // 假期的顏色配置
                    const holidayColors = holiday ? getHolidayColor(holiday) : null;

                    return (
                        <div
                            key={idx}
                            className={`relative flex flex-col items-center justify-center p-1 rounded-lg min-h-[36px] transition-all border
                            ${!isCurrMonth ? 'opacity-20 grayscale border-transparent' : 'opacity-100'}
                            ${displayHoliday
                                    ? `${holidayColors?.bg} ${holidayColors?.border}`
                                    : displayMilestone
                                        ? `${milestone.bg} border-transparent`
                                        : isSatSun
                                            ? 'bg-red-50 border-red-100 text-red-900/50'
                                            : 'bg-white border-blue-50 text-gray-700 hover:bg-blue-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600'
                                }
                        `}
                        >
                            <span
                                className={`text-xs font-medium z-10 ${displayHoliday
                                        ? holidayColors?.text
                                        : displayMilestone
                                            ? 'text-white'
                                            : isSatSun
                                                ? 'text-red-400'
                                                : 'text-gray-600'
                                    }`}
                            >
                                {format(day, 'd')}
                                {holiday?.type === 'workday' && ' ⚠️'}
                            </span>
                            {displayHoliday && (
                                <span className="text-[7px] leading-none text-white font-black truncate w-full text-center mt-0.5 px-0.5 drop-shadow-md">
                                    {holiday.type === 'workday' ? `🏢 ${holiday.name}` : holiday.name}
                                </span>
                            )}
                            {displayMilestone && (
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
}
