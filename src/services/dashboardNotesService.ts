import { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardNote {
    id: string;
    title: string;
    content: string;
}

export const dashboardNotesService = {
    async loadDashboardNotes(supabase: SupabaseClient, userId: string): Promise<DashboardNote[] | null> {
        const { data } = await supabase
            .from('user_settings')
            .select('dashboard_notes')
            .eq('user_id', userId)
            .single();

        return (data?.dashboard_notes as DashboardNote[]) ?? null;
    },

    async saveDashboardNotes(
        supabase: SupabaseClient,
        userId: string,
        notes: DashboardNote[]
    ): Promise<void> {
        const { error } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, dashboard_notes: notes });
        if (error) throw error;
    },
};
