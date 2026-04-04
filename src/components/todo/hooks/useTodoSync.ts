import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TodoTask } from '../types';
import { mapTodosToState, RawTodoRow } from './sync/todoMapper';
import { generateSystemTasks } from './sync/systemTaskGenerator';

export function useTodoSync() {
    const supabase = useMemo(() => createClient(), []);
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

            (existingTodos || [] as RawTodoRow[]).forEach((t: RawTodoRow) => {
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
                cleanExistingTodos = cleanExistingTodos.filter((t: RawTodoRow) => !duplicatesToDelete.includes(t.id));
            }

            const { data: activeCases, error: caseError } = await supabase
                .from('cases')
                .select('id, case_number, buyer_name, milestones(*), financials(*)')
                .eq('user_id', user.id)
                .neq('status', 'Closed')
                .neq('status', 'Cancelled');

            if (caseError) throw caseError;

            // 只把「未刪除」的 todo 傳入 generateSystemTasks
            // 已軟刪除的 todo 若日期仍存在，應重新 insert，而非被視為「已存在、無需更新」而跳過
            const nonDeletedExistingTodos = cleanExistingTodos.filter((t: RawTodoRow) => !t.is_deleted);
            const { todosToInsert, todosToUpdate, processedKeys } = generateSystemTasks(activeCases || [], nonDeletedExistingTodos, user.id, new Date());

            // 刪除日期已被清除的系統 todo（避免刪除日期後舊任務殘留）
            // processedKeys 包含所有「日期存在、有被處理」的 key，不在其中代表日期已被清空
            const activeCaseIdSet = new Set(activeCases?.map(c => c.id) || []);
            const todosToDelete = nonDeletedExistingTodos
                .filter(t =>
                    t.source_type === 'system' &&
                    t.case_id &&
                    t.source_key &&
                    activeCaseIdSet.has(t.case_id) &&
                    !processedKeys.has(`${t.case_id}_${t.source_key}`)
                )
                .map(t => t.id);

            if (todosToDelete.length > 0) {
                await supabase.from('todos').update({ is_deleted: true }).in('id', todosToDelete);
            }

            if (todosToUpdate.length > 0) await supabase.from('todos').upsert(todosToUpdate);
            if (todosToInsert.length > 0) await supabase.from('todos').insert(todosToInsert);

            // Fetch all todos again after sync to get the latest state, including new fields
            const { data: allTodos, error: fetchError } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_deleted', false)
                .order('due_date', { ascending: true });

            if (fetchError) {
                console.error('Error fetching todos after sync:', fetchError);
                return;
            }

            const activeCaseIds = new Set(activeCases?.map(c => c.id) || []);
            setTasks(mapTodosToState(allTodos || [], activeCases || [], activeCaseIds));
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => fetchAndSyncTodos())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'financials' }, () => fetchAndSyncTodos())
            .subscribe();

        // 跨元件同步
        const handleSync = () => fetchAndSyncTodos();
        window.addEventListener('todo-updated', handleSync);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('todo-updated', handleSync);
        };
    }, [fetchAndSyncTodos]);

    const toggleTask = async (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const newVal = !task.isCompleted;
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: newVal } : t)));
        await supabase.from('todos').update({ is_completed: newVal }).eq('id', id);
        window.dispatchEvent(new CustomEvent('todo-updated'));
    };

    const deleteTodo = async (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        const { error } = await supabase.from('todos').update({ is_deleted: true }).eq('id', id);
        if (error) await supabase.from('todos').delete().eq('id', id);
        window.dispatchEvent(new CustomEvent('todo-updated'));
    };

    const addManualTodo = async (content: string, dueDate: string, endDate?: string, isAllDay: boolean = false) => {
        if (!content.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.from('todos').insert([{
            user_id: user.id,
            content,
            is_completed: false,
            priority: 'not-urgent-important',
            due_date: new Date(dueDate).toISOString(),
            end_date: endDate ? new Date(endDate).toISOString() : null,
            is_all_day: isAllDay,
            source_type: 'manual',
        }]).select().single();

        if (data && !error) {
            fetchAndSyncTodos();
            window.dispatchEvent(new CustomEvent('todo-updated'));
        }
    };

    return { tasks, loading, toggleTask, deleteTodo, addManualTodo, refreshTodos: fetchAndSyncTodos };
}