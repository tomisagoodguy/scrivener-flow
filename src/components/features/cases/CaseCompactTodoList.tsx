'use client';

import { useState } from 'react';
import { useCaseTodos } from '@/hooks/useCaseTodos';
import { useRouter } from 'next/navigation';
import { Plus, X, Check } from 'lucide-react';

interface CaseCompactTodoListProps {
    caseId: string;
    todos: Record<string, boolean>;
    allTasks: string[];
    hideCompleted?: boolean;
}

export default function CaseCompactTodoList({
    caseId,
    todos = {},
    allTasks,
    hideCompleted = false,
}: CaseCompactTodoListProps) {
    const router = useRouter();
    const { todos: localTodos, loadingItem: updating, toggleTodo, addTodo, deleteTodo } = useCaseTodos(caseId, todos, '');

    // New State for adding tasks
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');

    const onToggle = (task: string) => {
        toggleTodo(task);
    };

    const handleAddTask = async () => {
        if (!newTaskName.trim()) return;
        try {
            await addTodo(newTaskName);
            setIsAdding(false);
            setNewTaskName('');
        } catch (e) {
            // Hook handles alerts
        }
    };

    const handleDeleteTask = async (e: React.MouseEvent, keyToDelete: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('確定要刪除此事項嗎？')) {
            deleteTodo(keyToDelete);
        }
    };

    // 所有已知前綴，用於辨別「未分類」 items
    const KNOWN_PREFIXES = ['SIG_', 'SEAL_', 'LOAN_', 'TAX_', 'HO_', 'S_', 'T_'];
    const hasKnownPrefix = (key: string) => KNOWN_PREFIXES.some((p) => key.startsWith(p));

    const customTasks = Object.keys(localTodos).filter((t) => {
        if (!isNaN(Number(t))) return false; // Filter numeric keys
        if (allTasks.includes(t)) return false; // Already in standard list
        if (hasKnownPrefix(t)) return false;    // Has a known stage prefix → belongs to ChecklistSection
        return true;
    });
    const displayTasks = [...allTasks, ...customTasks];

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {displayTasks
                .filter((task) => !hideCompleted || !localTodos[task])
                .map((task) => {
                    const isCompleted = localTodos[task];
                    const isUpdating = updating === task;
                    const isCustom = customTasks.includes(task);

                    return (
                        <div key={task} className="relative group flex items-center">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggle(task);
                                }}
                                disabled={!!updating}
                                className={`
                                    px-3 py-1 rounded-md text-[12px] font-medium border transition-all whitespace-normal text-left
                                    leading-tight
                                    ${isCompleted
                                        ? 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500 hover:text-white'
                                        : 'bg-red-400/5 text-red-600 border-red-500/20 hover:bg-red-500 hover:text-white'
                                    }
                                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transform hover:scale-105'}
                                    ${isCustom ? 'pr-7' : ''}
                                `}
                            >
                                {isCompleted ? '✓ ' : ''}
                                {task.replace(/^(SIG_|SEAL_|LOAN_|TAX_|HO_|S_|T_)/, '')}
                            </button>
                            {isCustom && (
                                <button
                                    type="button"
                                    onClick={(e) => handleDeleteTask(e, task)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/10 hover:bg-red-500 hover:text-white text-black/40 transition-all opacity-0 group-hover:opacity-100 z-10"
                                    title="刪除此事項"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    );
                })}

            {isAdding ? (
                <div className="flex items-center gap-1 border border-blue-200 rounded px-1 py-0.5 bg-blue-50">
                    <input
                        autoFocus
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTask();
                            }
                        }}
                        className="text-[12px] bg-transparent outline-none w-24 text-blue-800 placeholder:text-blue-300 min-w-[80px]"
                        placeholder="輸入事項..."
                    />
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            handleAddTask();
                        }}
                        className="text-green-600 hover:text-green-800 p-0.5"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setIsAdding(false);
                        }}
                        className="text-red-500 hover:text-red-700 p-0.5"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setIsAdding(true);
                    }}
                    className="px-2 py-1 rounded-md text-[12px] border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-1 opacity-60 hover:opacity-100"
                >
                    <Plus size={12} />
                    <span className="text-[10px]">新增</span>
                </button>
            )}
        </div>
    );
}
