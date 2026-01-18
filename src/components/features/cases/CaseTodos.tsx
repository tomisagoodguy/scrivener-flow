'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface CaseTodosProps {
    caseId: string;
    initialTodos: Record<string, boolean>;
    items: string[];
    hideCompleted?: boolean;
}

export default function CaseTodos({ caseId, initialTodos, items, hideCompleted = false }: CaseTodosProps) {
    const [todos, setTodos] = useState<Record<string, boolean>>(initialTodos || {});
    const [loading, setLoading] = useState<string | null>(null);

    const toggleTodo = async (e: React.MouseEvent, item: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading) return;

        const newValue = !todos[item];
        const updatedTodos = { ...todos, [item]: newValue };

        // Optimistic Update: Change UI immediately
        setTodos(updatedTodos);
        setLoading(item);

        try {
            const { data: currentData } = await supabase.from('cases').select('todos').eq('id', caseId).single();

            const mergedTodos = { ...((currentData?.todos as Record<string, boolean>) || {}), [item]: newValue };

            const { error } = await supabase.from('cases').update({ todos: mergedTodos }).eq('id', caseId);

            if (error) {
                setTodos(todos);
                throw error;
            }
        } catch (error: any) {
            console.error('Error updating todo:', error);
            // Log full error details for debugging
            if (error?.message) console.error('Error Message:', error.message);
            if (error?.details) console.error('Error Details:', error.details);
            if (error?.hint) console.error('Error Hint:', error.hint);

            alert(`更新狀態失敗: ${error.message || '未知錯誤 (Check Console)'}`);
            setTodos(todos);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 py-2">
            {items
                .filter((item) => !hideCompleted || !todos[item])
                .map((item) => {
                    const isCompleted = !!todos[item];
                    return (
                        <button
                            key={item}
                            type="button"
                            onClick={(e) => toggleTodo(e, item)}
                            disabled={loading === item}
                            className={`
                            px-3 py-1.5 rounded-full text-[12px] font-bold transition-all
                            border-2 flex items-center gap-1.5
                            ${
                                isCompleted
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                            }
                            ${loading === item ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                        `}
                        >
                            {isCompleted ? (
                                <svg
                                    className="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            )}
                            {item}
                        </button>
                    );
                })}
        </div>
    );
}
