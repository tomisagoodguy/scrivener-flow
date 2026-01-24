'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { useRouter } from 'next/navigation';
import { Plus, X, Check } from 'lucide-react';

interface CaseTodosProps {
    caseId: string;
    initialTodos: Record<string, boolean>;
    items: string[];
    hideCompleted?: boolean;
    allowAdd?: boolean;
    prefix?: string; // e.g. "S_" for Signing, "T_" for Transfer
    catchUncategorized?: boolean; // If true, show items that don't match any standard list or known prefix
}

export default function CaseTodos({
    caseId,
    initialTodos,
    items,
    hideCompleted = false,
    allowAdd = false,
    prefix = '',
    catchUncategorized = false
}: CaseTodosProps) {
    // console.log(`[CaseTodos] Render caseId=${caseId} prefix=${prefix}`);
    const router = useRouter();
    // Helper to normalize todos (handle transparent migration if DB has Array instead of Object)
    const normalizeTodos = (data: any): Record<string, boolean> => {
        if (Array.isArray(data)) {
            // Assume array of strings means ["Task1", "Task2"] are completed tasks
            return data.reduce((acc, key) => {
                if (typeof key === 'string') acc[key] = true;
                return acc;
            }, {} as Record<string, boolean>);
        }
        return data || {};
    };

    const [todos, setTodos] = useState<Record<string, boolean>>(normalizeTodos(initialTodos));
    const [loading, setLoadingState] = useState<string | null>(null);
    const loadingRef = useRef<string | null>(null);

    const setLoading = (val: string | null) => {
        setLoadingState(val);
        loadingRef.current = val;
    };

    // fetchLatestTodos to ensure we have the absolute latest data on mount, bypassing Next.js cache
    const fetchLatestTodos = async () => {
        const { data, error } = await supabase
            .from('cases')
            .select('todos')
            .eq('id', caseId)
            .single();

        if (data && !error) {
            console.log('[CaseTodos] Fetched fresh data on mount:', data.todos);
            setTodos(normalizeTodos(data.todos));
        }
    };

    // Sync state when initialTodos updates (e.g. router.refresh causes re-render with new data)
    useEffect(() => {
        setTodos(normalizeTodos(initialTodos));
    }, [initialTodos]);

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        // Fetch immediately on mount
        fetchLatestTodos();

        const channel = supabase
            .channel(`case-todos-${caseId}`)
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
                    // Only update if we are not currently updating locally (checked via Ref to avoid dependency change)
                    if (newCase && newCase.todos && !loadingRef.current) {
                        setTodos(normalizeTodos(newCase.todos));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [caseId]);

    // New State for adding tasks
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');

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

            const existingTodos = normalizeTodos(currentData?.todos);
            const mergedTodos = { ...existingTodos, [item]: newValue };

            const { error } = await supabase.from('cases').update({ todos: mergedTodos }).eq('id', caseId);

            if (error) {
                setTodos(todos);
                throw error;
            }
            // Removed router.refresh() to prevent stale data overwriting optimistic state. Realtime handles sync.
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

    const handleAddTask = async () => {
        if (!newTaskName.trim()) return;
        const rawTaskName = newTaskName.trim();
        // Prepend prefix if it doesn't exist (prevent double prefix if user typed it)
        const taskKey = prefix && !rawTaskName.startsWith(prefix) ? `${prefix}${rawTaskName}` : rawTaskName;

        // Optimistic update
        setTodos((prev) => ({
            ...prev,
            [taskKey]: false,
        }));
        setIsAdding(false);
        setNewTaskName('');

        try {
            const { data: currentData } = await supabase.from('cases').select('todos').eq('id', caseId).single();

            const existingTodos = normalizeTodos(currentData?.todos);
            const mergedTodos = { ...existingTodos, [taskKey]: false };

            const { error } = await supabase.from('cases').update({ todos: mergedTodos }).eq('id', caseId);

            if (error) throw error;
            // Removed router.refresh()
        } catch (error: any) {
            console.error('Error adding task:', error);
            alert('新增失敗');
            // Revert changes if needed
        }
    };

    const handleDeleteTask = async (e: React.MouseEvent, keyToDelete: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('確定要刪除此事項嗎？')) return;

        // Optimistic update
        const newTodos = { ...todos };
        delete newTodos[keyToDelete];
        setTodos(newTodos);

        try {
            const { data: currentData } = await supabase.from('cases').select('todos').eq('id', caseId).single();
            const currentTodos = (currentData?.todos as Record<string, boolean>) || {};

            const updatedTodos = { ...currentTodos };
            delete updatedTodos[keyToDelete];

            const { error } = await supabase.from('cases').update({ todos: updatedTodos }).eq('id', caseId);

            if (error) throw error;
            // Removed router.refresh()
        } catch (error: any) {
            console.error('Error deleting task:', error);
            alert('刪除失敗');
            // Revert (reload page or re-fetch would be better, but simpler to just leave as is for now)
        }
    };



    // Calculate display items
    // 1. Standard items (always shown unless hideCompleted)
    // 2. Custom items matching prefix
    // 3. Uncategorized items (if catchUncategorized is true)

    const knownPrefixes = ['S_', 'T_']; // Hardcoded known prefixes to detect uncategorized
    const standardSet = new Set(items);

    // Determine the actual keys we expect for standard items
    const prefixedItems = prefix ? items.map((i) => (i.startsWith(prefix) ? i : `${prefix}${i}`)) : items;
    const prefixedStandardSet = new Set(prefixedItems);

    const customKeys = Object.keys(todos).filter(key => {
        // Filter out numeric keys (artifacts from legacy Array storage)
        if (!isNaN(Number(key))) return false;

        if (standardSet.has(key)) return false; // Already in standard list (raw)
        if (prefixedStandardSet.has(key)) return false; // Already in standard list (prefixed)

        if (prefix && key.startsWith(prefix)) return true; // Matches our prefix

        if (catchUncategorized) {
            // Check if it starts with ANY known prefix
            const hasKnownPrefix = knownPrefixes.some(p => key.startsWith(p));
            if (!hasKnownPrefix) return true; // No prefix, so it's uncategorized
        }

        return false;
    });

    const displayItems = [...prefixedItems, ...customKeys];

    const getDisplayName = (key: string) => {
        if (prefix && key.startsWith(prefix)) return key.substring(prefix.length);
        // Also strip other known prefixes if showing uncategorized to be clean? 
        // No, show raw if uncategorized so user knows.
        return key;
    };



    // Debug logging
    // console.log(`[CaseTodos ${caseId}] Initial Todos:`, todos);
    // console.log(`[CaseTodos ${caseId}] Prefix:`, prefix);

    return (
        <div className="flex flex-wrap gap-2 py-2 items-center">
            {displayItems
                .filter((item) => !hideCompleted || !todos[item])
                .map((item) => {
                    const displayName = getDisplayName(item);

                    // Check if is custom task (in customKeys)
                    const isCustom = customKeys.includes(item);
                    const isCompleted = todos[item];

                    // Debug rendering
                    // console.log(`Rendering Item: ${item}, Completed: ${isCompleted}`);

                    return (
                        <div key={item} className="relative group flex items-center">
                            <button
                                type="button"
                                onClick={(e) => toggleTodo(e, item)}
                                disabled={loading === item}
                                className={`
                                    px-3 py-1.5 rounded-full text-[12px] font-bold transition-all
                                    border-2 flex items-center gap-1.5
                                    ${isCompleted
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                        : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                    }
                                    ${loading === item ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                                    ${isCustom ? 'pr-7' : ''} 
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

                                {displayName}
                            </button>

                            {isCustom && (
                                <button
                                    type="button"
                                    onClick={(e) => handleDeleteTask(e, item)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/10 hover:bg-red-500 hover:text-white text-black/40 transition-all opacity-0 group-hover:opacity-100 z-10"
                                    title="刪除此事項"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    );
                })}



            {allowAdd &&
                (isAdding ? (
                    <div className="flex items-center gap-1 border border-blue-200 rounded-full px-2 py-1 bg-blue-50">
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
                            <Check size={16} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setIsAdding(false);
                            }}
                            className="text-red-500 hover:text-red-700 p-0.5"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setIsAdding(true);
                        }}
                        className="
                            px-3 py-1.5 rounded-full text-[12px] font-bold transition-all
                            border-2 border-dashed border-slate-300 text-slate-400 
                            hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 
                            flex items-center gap-1.5 cursor-pointer opacity-70 hover:opacity-100
                        "
                    >
                        <Plus size={14} />
                        <span>新增</span>
                    </button>
                ))}
        </div>
    );
}
