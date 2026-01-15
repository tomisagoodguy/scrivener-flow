import { TodoTask } from './types';
import { format, addDays, isSameDay, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface TodoWeekViewProps {
    tasks: TodoTask[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export const TodoWeekView = ({ tasks, onToggle, onDelete }: TodoWeekViewProps) => {
    const today = startOfDay(new Date());
    const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

    const getTasksForDay = (date: Date) => {
        return tasks
            .filter(t => {
                const taskDate = new Date(t.date);
                return isSameDay(taskDate, date);
            })
            // Sort: Incomplete first, then by priority, then by time (if any)
            .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
                // Simple priority sort (High -> Low)
                const priorityWeight = { 'urgent-important': 3, 'not-urgent-important': 2, 'urgent-not-important': 1, 'not-urgent-not-important': 0 };
                const pA = priorityWeight[a.priority] || 0;
                const pB = priorityWeight[b.priority] || 0;
                if (pA !== pB) return pB - pA;
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
    };

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center gap-2 text-sm text-blue-700 dark:text-blue-200">
                <CalendarIcon />
                <span className="font-bold">未來七天概覽 (Weekly Focus)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {next7Days.map((day, idx) => {
                    const dayTasks = getTasksForDay(day);
                    const isToday = isSameDay(day, today);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                        <div
                            key={day.toISOString()}
                            className={`
                                flex flex-col rounded-xl border p-3 min-h-[150px] transition-all
                                ${isToday ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-100' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200'}
                                ${isWeekend ? 'bg-slate-100/50' : ''}
                            `}
                        >
                            {/* Header */}
                            <div className={`
                                flex justify-between items-center mb-3 pb-2 border-b 
                                ${isToday ? 'border-blue-100' : 'border-slate-100'}
                            `}>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-2xl font-black ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    <span className={`text-xs font-bold uppercase ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>
                                        {format(day, 'EEE', { locale: zhTW })}
                                    </span>
                                    {isToday && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">TODAY</span>}
                                </div>
                                <span className="text-xs font-medium text-slate-400">
                                    {dayTasks.length} 事項
                                </span>
                            </div>

                            {/* Tasks List */}
                            <div className="flex-1 space-y-2">
                                {dayTasks.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 text-xs italic py-4">
                                        無安排事項
                                    </div>
                                ) : (
                                    dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`
                                                group relative p-2 rounded-lg border transition-all text-xs
                                                ${task.isCompleted
                                                    ? 'bg-slate-50 border-slate-100 decoration-slate-400 grayscale opacity-70'
                                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}
                                            `}
                                        >
                                            <div className="flex items-start gap-2">
                                                <button
                                                    onClick={() => onToggle(task.id)}
                                                    className={`mt-0.5 min-w-[14px] h-[14px] rounded border flex items-center justify-center transition-colors
                                                        ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-blue-500'}
                                                    `}
                                                >
                                                    {task.isCompleted && <CheckCircle2 size={10} />}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-medium line-clamp-2 ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                        {task.title}
                                                    </div>

                                                    {/* Metadata Row */}
                                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                        {/* Priority Dot */}
                                                        {task.priority === 'urgent-important' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="緊急重要"></span>}

                                                        {/* Type Badge */}
                                                        <span className={`
                                                            px-1 py-0.5 rounded text-[9px] font-bold border
                                                            ${task.type === 'legal' ? 'bg-amber-50 text-amber-600 border-amber-100' : ''}
                                                            ${task.type === 'tax' ? 'bg-rose-50 text-rose-600 border-rose-100' : ''}
                                                            ${task.type === 'appointment' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : ''}
                                                            ${task.type === 'personal' ? 'bg-slate-50 text-slate-600 border-slate-100' : ''}
                                                       `}>
                                                            {task.type === 'legal' ? '法定' : task.type === 'tax' ? '稅務' : task.type === 'appointment' ? '約定' : '個人'}
                                                        </span>

                                                        {/* Time if available */}
                                                        {task.date.getHours() !== 0 && (
                                                            <span className="flex items-center gap-0.5 text-[9px] text-slate-400 font-mono bg-slate-100 px-1 rounded">
                                                                <Clock size={8} />
                                                                {format(task.date, 'HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Summary Footer */}
            <div className="mt-4 text-center text-xs text-slate-400">
                僅顯示未來 7 天的待辦事項。若要查看更遠的行程，請切換至完整行事曆模式。
            </div>
        </div>
    );
};

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);
