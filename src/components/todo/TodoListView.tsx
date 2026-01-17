import { TodoTask } from './types';
import { CheckCircle2, Circle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Props {
    tasks: TodoTask[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

const TaskItem = ({
    task,
    onToggle,
    onDelete,
}: {
    task: TodoTask;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}) => {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'legal':
                return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/30';
            case 'tax':
                return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/30';
            case 'appointment':
                return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30';
            default:
                return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/30';
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'legal':
                return '法定';
            case 'tax':
                return '稅單';
            case 'appointment':
                return '預約';
            default:
                return '個人';
        }
    };

    return (
        <div
            className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                task.isCompleted
                    ? 'bg-slate-50 border-transparent opacity-60 dark:bg-slate-800/50'
                    : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
        >
            <button
                onClick={() => onToggle(task.id)}
                className={`mt-0.5 flex-shrink-0 transition-colors ${task.isCompleted ? 'text-blue-500' : 'text-slate-300 hover:text-blue-400'}`}
            >
                {task.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4
                        className={`text-sm font-semibold whitespace-pre-wrap pr-2 ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}
                    >
                        {task.title}
                    </h4>
                    <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${getTypeColor(task.type)} whitespace-nowrap`}
                    >
                        {getTypeName(task.type)}
                    </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        📅 {format(task.date, 'MM/dd HH:mm', { locale: zhTW })}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="text-red-400 hover:text-red-600 px-1 rounded transition-colors"
                        title="刪除"
                    >
                        🗑️
                    </button>
                    {task.caseName && (
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">
                            📁 {task.caseName}
                        </span>
                    )}
                </div>
                {task.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">Note: {task.notes}</p>}
            </div>
        </div>
    );
};

export function TodoListView({ tasks, onToggle, onDelete }: Props) {
    // Sort: Incomplete first, then by date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.isCompleted === b.isCompleted) {
            return a.date.getTime() - b.date.getTime();
        }
        return a.isCompleted ? 1 : -1;
    });

    const todayTasks = sortedTasks.filter((t) => !t.isCompleted && isToday(t.date));
    const upcomingTasks = sortedTasks.filter((t) => !t.isCompleted && !isToday(t.date) && !isPast(t.date));
    const overdueTasks = sortedTasks.filter((t) => !t.isCompleted && isPast(t.date) && !isToday(t.date));
    const completedTasks = sortedTasks.filter((t) => t.isCompleted);

    return (
        <div className="space-y-6">
            {/* Overdue */}
            {overdueTasks.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
                        ⚠️ 逾期未完成 ({overdueTasks.length})
                    </h3>
                    <div className="space-y-2">
                        {overdueTasks.map((task) => (
                            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
                        ))}
                    </div>
                </section>
            )}

            {/* Today */}
            <section>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    🔥 今日待辦 ({todayTasks.length})
                </h3>
                <div className="space-y-2">
                    {todayTasks.length > 0 ? (
                        todayTasks.map((task) => (
                            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
                        ))
                    ) : (
                        <div className="text-center py-6 text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-900/50 rounded-lg border-dashed border border-slate-200">
                            今天沒有待辦事項，好棒！🎉
                        </div>
                    )}
                </div>
            </section>

            {/* Upcoming */}
            <section>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    📅 未來計畫 ({upcomingTasks.length})
                </h3>
                <div className="space-y-2">
                    {upcomingTasks.map((task) => (
                        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
                    ))}
                </div>
            </section>

            {/* Completed */}
            {completedTasks.length > 0 && (
                <section className="opacity-75">
                    <h3 className="text-sm font-bold text-slate-500 mb-3">✅ 已完成 ({completedTasks.length})</h3>
                    <div className="space-y-2">
                        {completedTasks.map((task) => (
                            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
