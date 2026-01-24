'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
    // console.log(`[CaseCompactTodoList] Render caseId=${caseId}`);
    const router = useRouter();

    // Helper to normalize todos
    const normalizeTodos = (data: any): Record<string, boolean> => {
        if (Array.isArray(data)) {
            return data.reduce((acc, key) => {
                if (typeof key === 'string') acc[key] = true;
                return acc;
            }, {} as Record<string, boolean>);
        }
        return data || {};
    };

    const [localTodos, setLocalTodos] = useState(normalizeTodos(todos));
    const [updating, setUpdatingState] = useState<string | null>(null);
    const updatingRef = useRef<string | null>(null);

    const setUpdating = (val: string | null) => {
        setUpdatingState(val);
        updatingRef.current = val;
    };

    // New State for adding tasks
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');

    const fetchLatestTodos = async () => {
        const { data, error } = await supabase
            .from('cases')
            .select('todos')
            .eq('id', caseId)
            .single();

        if (data && !error) {
            setLocalTodos(normalizeTodos(data.todos));
        }
    };

    useEffect(() => {
        setLocalTodos(normalizeTodos(todos));
    }, [todos]);

    // Real-time Subscription & Initial Fetch
    useEffect(() => {
        fetchLatestTodos();

        const channel = supabase
            .channel(`case-compact-list-${caseId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'cases',
                    filter: `id=eq.${caseId}`,
                },
                (payload) => {
                    const newCase = payload.new as any;
                    // Only update if we are not currently updating ourselves (to avoid race conditions/jitter)
                    if (newCase && newCase.todos && !updatingRef.current) {
                        setLocalTodos(normalizeTodos(newCase.todos));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [caseId]);

    const toggleTodo = async (task: string) => {
        if (updating) return; // Prevent double clicks

        const newValue = !localTodos[task];
        setUpdating(task);

        // Optimistic update
        setLocalTodos((prev) => ({
            ...prev,
            [task]: newValue,
        }));

        try {
            // Fetch current latest to avoid race conditions
            const { data: currentData, error: fetchError } = await supabase
                .from('cases')
                .select('todos')
                .eq('id', caseId)
                .single();

            if (fetchError) {
                console.error('Error fetching current todos:', fetchError);
            }

            const existingTodos = normalizeTodos(currentData?.todos) || localTodos || {};
            const mergedTodos = { ...existingTodos, [task]: newValue };

            // console.log(`Updating case ${caseId} todo [${task}] to ${newValue}`);

            const { error: updateError } = await supabase.from('cases').update({ todos: mergedTodos }).eq('id', caseId);

            if (updateError) {
                console.error('Supabase Update Error Detailed:', JSON.stringify(updateError, null, 2));
                throw updateError;
            }

            // Removed router.refresh() to rely on Realtime
        } catch (error: any) {
            console.error('Error updating todo:', error);
            // Revert
            setLocalTodos((prev) => ({
                ...prev,
                [task]: !newValue,
            }));
            alert(`更新失敗: ${error.message || '未知錯誤'}`);
        } finally {
            setUpdating(null);
        }
    };

    const handleAddTask = async () => {
        if (!newTaskName.trim()) return;
        const taskName = newTaskName.trim();

        // Optimistic update
        setLocalTodos((prev) => ({
            ...prev,
            [taskName]: false,
        }));
        setIsAdding(false);
        setNewTaskName('');

        try {
            const { data: currentData } = await supabase.from('cases').select('todos').eq('id', caseId).single();

            const existingTodos = normalizeTodos(currentData?.todos) || localTodos || {};
            const mergedTodos = { ...existingTodos, [taskName]: false };

            const { error } = await supabase.from('cases').update({ todos: mergedTodos }).eq('id', caseId);
            if (error) throw error;
            // Removed router.refresh()
        } catch (error: any) {
            console.error('Error adding task:', error);
            alert('新增失敗');
        }
    };

    const handleDeleteTask = async (e: React.MouseEvent, keyToDelete: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('確定要刪除此事項嗎？')) return;

        // Optimistic update
        const newTodos = { ...localTodos };
        delete newTodos[keyToDelete];
        setLocalTodos(newTodos);

        try {
            const { data: currentData } = await supabase.from('cases').select('todos').eq('id', caseId).single();
            const currentTodos = normalizeTodos(currentData?.todos) || {};

            const updatedTodos = { ...currentTodos };
            delete updatedTodos[keyToDelete];

            const { error } = await supabase.from('cases').update({ todos: updatedTodos }).eq('id', caseId);

            if (error) throw error;
            // Removed router.refresh()
        } catch (error: any) {
            console.error('Error deleting task:', error);
            alert('刪除失敗');
        }
    };

    // Compute display tasks
    const customTasks = Object.keys(localTodos).filter((t) => {
        if (!isNaN(Number(t))) return false; // Filter numeric keys
        return !allTasks.includes(t);
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
                                    toggleTodo(task);
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
                                {task.replace(/^(S_|T_)/, '')}
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
