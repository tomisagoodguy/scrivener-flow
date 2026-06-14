import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { syncTodoToCalendar } from '@/app/actions/calendarSync';

/**
 * 觸發單一待辦的 Google 行事曆同步。
 * 輔助行為：失敗只記錄、不 rethrow，不可中斷待辦操作。
 */
async function triggerCalendarSync(todoId: string): Promise<void> {
    try {
        await syncTodoToCalendar(todoId);
    } catch (e) {
        console.error('[TodoService] 行事曆同步失敗（不中斷）:', e);
    }
}

export interface ManualTodo {
    id: string;
    content: string;
    due_date: string;
    is_completed: boolean;
    priority: string;
}

export interface ManualTodoInsert {
    user_id: string;
    content: string;
    due_date: string;
    source_type: 'manual';
    is_completed: boolean;
    priority: string;
}

export const todoService = {
    async fetchManualTodos(supabase: SupabaseClient, userId: string): Promise<ManualTodo[]> {
        const { data } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .eq('source_type', 'manual')
            .eq('is_deleted', false)
            .order('due_date', { ascending: true });

        return data ?? [];
    },

    async createTodo(supabase: SupabaseClient, payload: ManualTodoInsert): Promise<void> {
        const { data, error } = await supabase.from('todos').insert([payload]).select('id').single();
        if (error) throw error;
        if (data?.id) await triggerCalendarSync(data.id);
    },

    async toggleTodo(supabase: SupabaseClient, id: string, currentStatus: boolean): Promise<void> {
        const { error } = await supabase
            .from('todos')
            .update({ is_completed: !currentStatus })
            .eq('id', id);
        if (error) throw error;
        await triggerCalendarSync(id);
    },

    async deleteTodo(supabase: SupabaseClient, id: string): Promise<void> {
        const { error } = await supabase.from('todos').delete().eq('id', id);
        if (error) throw error;
        await triggerCalendarSync(id);
    },

    subscribeToTodos(
        supabase: SupabaseClient,
        userId: string,
        onChange: () => void
    ): RealtimeChannel {
        return supabase
            .channel('dashboard-tasks')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'todos' },
                onChange
            )
            .subscribe();
    },
};
