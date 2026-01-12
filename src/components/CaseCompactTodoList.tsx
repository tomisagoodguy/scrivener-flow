'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface CaseCompactTodoListProps {
    caseId: string;
    todos: Record<string, boolean>;
    allTasks: string[];
    hideCompleted?: boolean;
}

export default function CaseCompactTodoList({ caseId, todos = {}, allTasks, hideCompleted = false }: CaseCompactTodoListProps) {
    const router = useRouter();
    const [localTodos, setLocalTodos] = useState(todos);
    const [updating, setUpdating] = useState<string | null>(null);

    // Sync state if props change (e.g. from router.refresh())
    // This ensures that if other clients update the DB, we see it eventually if the page revalidates
    if (JSON.stringify(todos) !== JSON.stringify(localTodos) && !updating) {
        // setLocalTodos(todos); // Commented out to avoid infinite loop or jitter during optimistic updates, 
        // but typically we want to trust server data if we aren't currently editing.
        // For now, let's just initialize once and trust optimistic updates, OR use a useEffect.
    }

    const toggleTodo = async (task: string) => {
        if (updating) return; // Prevent double clicks

        const newValue = !localTodos[task];
        setUpdating(task);

        // Optimistic update
        setLocalTodos(prev => ({
            ...prev,
            [task]: newValue
        }));

        try {
            // Fetch current latest to avoid race conditions
            const { data: currentData, error: fetchError } = await supabase
                .from('cases')
                .select('todos')
                .eq('id', caseId)
                .single();

            if (fetchError) {
                console.error("Error fetching current todos:", fetchError);
                // We will proceed with local state as base if fetch fails, to try to overwrite/save anyway?
                // Or maybe we should allow it. Let's try to proceed.
            }

            const existingTodos = (currentData?.todos as Record<string, boolean>) || localTodos || {};
            const mergedTodos = { ...existingTodos, [task]: newValue };

            console.log(`Updating case ${caseId} todo [${task}] to ${newValue}`);

            const { error: updateError } = await supabase
                .from('cases')
                .update({ todos: mergedTodos })
                .eq('id', caseId);

            if (updateError) {
                console.error("Supabase Update Error Detailed:", JSON.stringify(updateError, null, 2));
                throw updateError;
            }

            router.refresh();
        } catch (error: any) {
            console.error('Error updating todo:', error);
            // Revert
            setLocalTodos(prev => ({
                ...prev,
                [task]: !newValue
            }));
            alert(`更新失敗: ${error.message || '未知錯誤'}`);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {allTasks
                .filter(task => !hideCompleted || !localTodos[task])
                .map(task => {
                    const isCompleted = localTodos[task];
                    const isUpdating = updating === task;

                    return (
                        <button
                            key={task}
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
                            `}
                        >
                            {isCompleted ? '✓ ' : ''}{task}
                        </button>
                    );
                })}
        </div>
    );
}
