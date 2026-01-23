import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TodoTask } from '../types';
import { mapTodosToState } from './sync/todoMapper';
import { generateSystemTasks } from './sync/systemTaskGenerator';

export function useTodoSync() {
    const [tasks, setTasks] = useState<TodoTask[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAndSyncTodos = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: existingTodos, error: todoError } = await supabase.from('todos').select('*').eq('user_id', user.id);
            if (todoError) throw todoError;

            // Cleanup duplicates
            const uniqueMap = new Map<string, string>();
            const duplicatesToDelete: string[] = [];
            let cleanExistingTodos = existingTodos || [];

            (existingTodos || []).forEach((t: any) => {
                if (t.source_type === 'system' && t.case_id && t.source_key) {
                    const key = `${t.case_id}_${t.source_key}`;
                    if (uniqueMap.has(key)) duplicatesToDelete.push(t.id);
                    else uniqueMap.set(key, t.id);
                } else if (t.source_type === 'system' && !t.source_key) {
                    duplicatesToDelete.push(t.id);
                }
            });

            if (duplicatesToDelete.length > 0) {
                await supabase.from('todos').delete().in('id', duplicatesToDelete);
                cleanExistingTodos = cleanExistingTodos.filter((t: any) => !duplicatesToDelete.includes(t.id));
            }

            const { data: activeCases, error: caseError } = await supabase
                .from('cases')
                .select('id, case_number, buyer_name, milestones(*), financials(*)')
                .eq('user_id', user.id)
                .neq('status', 'Closed')
                .neq('status', 'Cancelled');

            if (caseError) throw caseError;

            const { todosToInsert, todosToUpdate } = generateSystemTasks(activeCases || [], cleanExistingTodos, user.id, new Date());

            if (todosToUpdate.length > 0) await supabase.from('todos').upsert(todosToUpdate);
            if (todosToInsert.length > 0) await supabase.from('todos').insert(todosToInsert);

            const activeCaseIds = new Set(activeCases?.map(c => c.id) || []);
            setTasks(mapTodosToState(cleanExistingTodos, activeCases || [], activeCaseIds));
        } catch (err) {
            console.error('Todo Sync Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndSyncTodos();
        const channel = supabase.channel('todos-main-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => fetchAndSyncTodos())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchAndSyncTodos]);

    const toggleTask = async (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const newVal = !task.isCompleted;
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: newVal } : t)));
        await supabase.from('todos').update({ is_completed: newVal }).eq('id', id);
    };

    const deleteTodo = async (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        const { error } = await supabase.from('todos').update({ is_deleted: true }).eq('id', id);
        if (error) await supabase.from('todos').delete().eq('id', id);
    };

    const addManualTodo = async (content: string, dueDate: string) => {
        if (!content.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.from('todos').insert([{
            user_id: user.id,
            content,
            is_completed: false,
            priority: 'not-urgent-important',
            due_date: new Date(dueDate).toISOString(),
            source_type: 'manual',
        }]).select().single();

        if (data && !error) fetchAndSyncTodos();
    };

    return { tasks, loading, toggleTask, deleteTodo, addManualTodo, refreshTodos: fetchAndSyncTodos };
}
