import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UseCaseTodosReturn {
    todos: Record<string, boolean>;
    loadingItem: string | null;
    toggleTodo: (item: string) => Promise<void>;
    addTodo: (taskName: string) => Promise<void>;
    deleteTodo: (keyToDelete: string) => Promise<void>;
}

export const useCaseTodos = (
    caseId: string,
    initialTodos: Record<string, boolean> = {},
    prefix: string = ''
): UseCaseTodosReturn => {
    const supabase = useMemo(() => createClient(), []);

    // Helper to normalize todos
    const normalizeTodos = useCallback((data: unknown): Record<string, boolean> => {
        if (Array.isArray(data)) {
            return data.reduce((acc, key) => {
                if (typeof key === 'string') acc[key] = true;
                return acc;
            }, {} as Record<string, boolean>);
        }
        // Ensure values are boolean if data is object
        if (data && typeof data === 'object') {
            const normalized: Record<string, boolean> = {};
            const record = data as Record<string, unknown>;
            Object.keys(record).forEach(key => {
                normalized[key] = !!record[key];
            });
            return normalized;
        }
        return {};
    }, []);

    const [todos, setTodos] = useState<Record<string, boolean>>(normalizeTodos(initialTodos));
    const [loadingItem, setLoadingItem] = useState<string | null>(null);
    const loadingRef = useRef<string | null>(null);

    const setLoading = (val: string | null) => {
        setLoadingItem(val);
        loadingRef.current = val;
    };

    // Client-side fetch to bypass Next.js Router Cache
    const fetchLatestTodos = useCallback(async () => {
        const { data, error } = await supabase
            .from('cases')
            .select('todos')
            .eq('id', caseId)
            .single();

        if (data && !error) {
            setTodos(normalizeTodos(data.todos));
        }
    }, [caseId, normalizeTodos, supabase]);

    // Sync with props
    const initialTodosJson = JSON.stringify(initialTodos);
    useEffect(() => {
        setTodos(normalizeTodos(JSON.parse(initialTodosJson)));
    }, [initialTodosJson, normalizeTodos]);

    // Real-time Subscription & Initial Fetch
    useEffect(() => {
        fetchLatestTodos();

        const channel = supabase
            .channel(`case-todos-sync-${caseId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'cases',
                    filter: `id=eq.${caseId}`,
                },
                (payload) => {
                    const newCase = payload.new as Record<string, unknown>;
                    // Only update if we are not currently updating locally
                    if (newCase && newCase.todos && !loadingRef.current) {
                        setTodos(normalizeTodos(newCase.todos));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [caseId, fetchLatestTodos, normalizeTodos, supabase]);

    const toggleTodo = async (item: string) => {
        if (loadingRef.current) return; // Prevent double clicks / race conditions locally

        const newValue = !todos[item];
        const updatedTodos = { ...todos, [item]: newValue };

        // Optimistic Update
        setTodos(updatedTodos);
        setLoading(item);

        try {
            const { data: currentData } = await supabase
                .from('cases')
                .select('todos')
                .eq('id', caseId)
                .single();

            const existingTodos = normalizeTodos(currentData?.todos);
            const mergedTodos = { ...existingTodos, [item]: newValue };

            const { error } = await supabase
                .from('cases')
                .update({ todos: mergedTodos })
                .eq('id', caseId);

            if (error) {
                // 如果更新失敗，回滾狀態
                setTodos(todos); 
                throw error;
            }
        } catch (error: unknown) {
            console.error('Error updating todo:', error);
            // Revert by re-fetching essentially or simple toggle back
            fetchLatestTodos();
            const msg = error instanceof Error ? error.message : '未知錯誤';
            // 防止 alert 造成某些環境閃退，改用 console error (或者視情況 alert)
            console.error(`更新狀態失敗: ${msg}`);
            // alert(`更新狀態失敗: ${msg}`); 
        } finally {
            setLoading(null);
        }
    };

    const addTodo = async (taskName: string) => {
        if (!taskName.trim()) return;
        const rawTaskName = taskName.trim();
        // Handle prefix logic
        const taskKey = prefix && !rawTaskName.startsWith(prefix)
            ? `${prefix}${rawTaskName}`
            : rawTaskName;

        // Optimistic
        setTodos((prev) => ({
            ...prev,
            [taskKey]: false,
        }));

        try {
            const { data: currentData } = await supabase.from('cases').select('todos').eq('id', caseId).single();
            const existingTodos = normalizeTodos(currentData?.todos);
            const mergedTodos = { ...existingTodos, [taskKey]: false };

            const { error } = await supabase.from('cases').update({ todos: mergedTodos }).eq('id', caseId);
            if (error) throw error;
        } catch (error: unknown) {
            console.error('Error adding task:', error);
            fetchLatestTodos(); // Revert/Sync
            // alert('新增失敗'); 
        }
    };

    const deleteTodo = async (keyToDelete: string) => {
        // Optimistic
        const newTodos = { ...todos };
        delete newTodos[keyToDelete];
        setTodos(newTodos);

        try {
            const { data: currentData } = await supabase.from('cases').select('todos').eq('id', caseId).single();
            const currentTodos = normalizeTodos(currentData?.todos);
            const updatedTodos = { ...currentTodos };
            delete updatedTodos[keyToDelete];

            const { error } = await supabase.from('cases').update({ todos: updatedTodos }).eq('id', caseId);
            if (error) throw error;
        } catch (error: unknown) {
            console.error('Error deleting task:', error);
            fetchLatestTodos();
            // alert('刪除失敗');
        }
    };

    return {
        todos,
        loadingItem,
        toggleTodo,
        addTodo,
        deleteTodo
    };
};
