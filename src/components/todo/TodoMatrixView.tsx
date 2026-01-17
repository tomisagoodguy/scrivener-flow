import { TodoTask } from './types';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface Props {
    tasks: TodoTask[];
    onToggle: (id: string) => void;
    onDelete?: (id: string) => void;
}

const MiniTaskCard = ({
    task,
    onToggle,
    onDelete,
}: {
    task: TodoTask;
    onToggle: (id: string) => void;
    onDelete?: (id: string) => void;
}) => {
    return (
        <div className="group bg-white dark:bg-slate-800 p-2 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-2 text-xs relative">
            <input
                type="checkbox"
                checked={task.isCompleted}
                onChange={() => onToggle(task.id)}
                className="mt-0.5 rounded text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
                <div
                    className={`truncate font-medium ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}
                >
                    {task.title}
                </div>
                <div className="text-[10px] text-slate-400">
                    {format(task.date, 'MM/dd')} {task.caseName ? `• ${task.caseName}` : ''}
                </div>
            </div>
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-0.5"
                    title="刪除"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            )}
        </div>
    );
};

export function TodoMatrixView({ tasks, onToggle, onDelete }: Props) {
    // Filter only active tasks typically, but showing completed crossed out is okay too.
    // We'll separate based on priority.

    const q1 = tasks.filter((t) => t.priority === 'urgent-important');
    const q2 = tasks.filter((t) => t.priority === 'not-urgent-important');

    const Quadrant = ({
        title,
        desc,
        tasks,
        colorClass,
        bgClass,
    }: {
        title: string;
        desc: string;
        tasks: TodoTask[];
        colorClass: string;
        bgClass: string;
    }) => (
        <div className={`rounded-xl p-3 flex flex-col h-full overflow-hidden border ${colorClass} ${bgClass}`}>
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-black/5 dark:border-white/5">
                <div>
                    <h3 className={`font-bold text-sm ${TitleColors[title]}`}>{title}</h3>
                    <p className="text-[10px] opacity-70">{desc}</p>
                </div>
                <span className="text-xs font-bold opacity-50">{tasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {tasks.map((t) => (
                    <MiniTaskCard key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} />
                ))}
                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs opacity-40 italic">無事項</div>
                )}
            </div>
        </div>
    );

    const TitleColors: Record<string, string> = {
        重要且緊急: 'text-red-600 dark:text-red-400',
        重要但不緊急: 'text-blue-600 dark:text-blue-400',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[500px]">
            <Quadrant
                title="重要且緊急"
                desc="立刻去做 (Do First)"
                tasks={q1}
                colorClass="border-red-200 dark:border-red-900"
                bgClass="bg-red-50/50 dark:bg-red-900/10"
            />
            <Quadrant
                title="重要但不緊急"
                desc="排程處理 (Schedule)"
                tasks={q2}
                colorClass="border-blue-200 dark:border-blue-900"
                bgClass="bg-blue-50/50 dark:bg-blue-900/10"
            />
        </div>
    );
}
