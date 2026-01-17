import { TodoTask } from './types';
import {
    format,
    isSameDay,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    isToday,
    addMonths,
    subMonths,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    tasks: TodoTask[];
    onToggle: (id: string) => void;
    onDelete?: (id: string) => void;
}

export function TodoCalendarView({ tasks, onToggle, onDelete }: Props) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayTasks = (day: Date) => tasks.filter((t) => isSameDay(t.date, day));

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    return (
        <div className="h-full flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                    {format(currentDate, 'yyyy年 M月', { locale: zhTW })}
                </h3>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200"
                    >
                        今天
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 flex-1 relative z-0">
                {/* Weekday Headers */}
                {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                    <div
                        key={d}
                        className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-semibold text-slate-500 first:rounded-tl-lg last:rounded-tr-lg"
                    >
                        {d}
                    </div>
                ))}

                {/* Calendar Cells */}
                {days.map((day, idx) => {
                    const dayTasks = getDayTasks(day);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isTodayDate = isToday(day);

                    // Logic to handle rounded corners for bottom cells
                    const isLastRow = idx >= days.length - 7;
                    const isBottomLeft = isLastRow && idx % 7 === 0;
                    const isBottomRight = isLastRow && idx % 7 === 6;
                    const cellRoundedClass = isBottomLeft ? 'rounded-bl-lg' : isBottomRight ? 'rounded-br-lg' : '';

                    return (
                        <div
                            key={day.toString()}
                            className={`bg-white dark:bg-slate-800 min-h-[80px] p-1 flex flex-col gap-1 transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${
                                !isCurrentMonth ? 'opacity-40 bg-slate-50 dark:bg-slate-800/50' : ''
                            } ${cellRoundedClass}`}
                        >
                            <div
                                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ml-auto ${
                                    isTodayDate
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {format(day, 'd')}
                            </div>

                            <div className="flex-1 overflow-visible space-y-1 relative">
                                {dayTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`group relative text-[10px] px-1 py-0.5 rounded border cursor-pointer ${
                                            task.isCompleted
                                                ? 'line-through opacity-50 bg-gray-100 text-gray-400'
                                                : (() => {
                                                      switch (task.type) {
                                                          case 'legal':
                                                              return 'bg-red-50 text-red-700 border-red-100';
                                                          case 'tax':
                                                              return 'bg-amber-50 text-amber-700 border-amber-100';
                                                          case 'appointment':
                                                              return 'bg-blue-50 text-blue-700 border-blue-100';
                                                          default:
                                                              return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                                      }
                                                  })()
                                        }`}
                                    >
                                        {/* Original Mini View */}
                                        <div onClick={() => onToggle(task.id)} className="truncate">
                                            <span className={onDelete ? 'group-hover:pr-3' : ''}>{task.title}</span>
                                        </div>

                                        {/* Magnified Tooltip */}
                                        <div
                                            className={`hidden group-hover:block absolute bottom-full mb-1 w-64 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 z-[100] text-left pointer-events-none ${
                                                // Smart positioning: if it's Sunday/Monday/Tuesday (0,1,2), align left.
                                                // If it's Saturday/Friday (5,6) etc, align right to avoid overflow.
                                                day.getDay() === 5 || day.getDay() === 6 ? 'right-0' : 'left-0'
                                            }`}
                                        >
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 leading-snug break-words">
                                                {task.title}
                                            </h4>
                                            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <span>📅</span>
                                                    <span>{format(task.date, 'yyyy/MM/dd HH:mm')}</span>
                                                </div>
                                                {task.caseName && (
                                                    <div className="flex items-center gap-1">
                                                        <span>📁</span>
                                                        <span>{task.caseName}</span>
                                                    </div>
                                                )}
                                                {task.priority && (
                                                    <div className="flex items-center gap-1">
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700`}
                                                        >
                                                            {task.priority === 'urgent-important'
                                                                ? '🔥 重要且緊急'
                                                                : task.priority}
                                                        </span>
                                                    </div>
                                                )}
                                                {task.notes && (
                                                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-700 italic opacity-80">
                                                        Note: {task.notes}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Triangle arrow */}
                                            <div
                                                className={`absolute top-full -mt-px w-2 h-2 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-600 transform rotate-45 ${
                                                    day.getDay() === 5 || day.getDay() === 6 ? 'right-4' : 'left-4'
                                                }`}
                                            ></div>
                                        </div>

                                        {onDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(task.id);
                                                }}
                                                className="absolute right-0.5 top-0.5 hidden group-hover:flex items-center justify-center w-3 h-3 bg-red-500 text-white rounded-full opacity-80 hover:opacity-100 z-10"
                                                title="刪除"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
