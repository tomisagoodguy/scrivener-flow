import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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
        const { error } = await supabase.from('todos').insert([payload]);
        if (error) throw error;
    },

    async toggleTodo(supabase: SupabaseClient, id: string, currentStatus: boolean): Promise<void> {
        const { error } = await supabase
            .from('todos')
            .update({ is_completed: !currentStatus })
            .eq('id', id);
        if (error) throw error;
    },

    async deleteTodo(supabase: SupabaseClient, id: string): Promise<void> {
        const { error } = await supabase.from('todos').delete().eq('id', id);
        if (error) throw error;
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
