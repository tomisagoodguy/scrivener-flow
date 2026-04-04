import { SupabaseClient } from '@supabase/supabase-js';
import { TeamNote } from '@/components/knowledge/NoteCard';

export interface TeamNoteInsert {
    title: string;
    content: string;
    category: string;
    tags: string[];
    author_id: string;
}

export interface TeamNoteUpdate {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
}

export const noteService = {
    async getNote(supabase: SupabaseClient, noteId: string): Promise<TeamNote | null> {
        const { data, error } = await supabase
            .from('team_notes')
            .select('*')
            .eq('id', noteId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data ? { ...data, author_name: '匿名' } : null;
    },

    async createNote(supabase: SupabaseClient, noteData: TeamNoteInsert): Promise<void> {
        const { error } = await supabase.from('team_notes').insert([noteData]);
        if (error) throw error;
    },

    async updateNote(supabase: SupabaseClient, noteId: string, noteData: TeamNoteUpdate): Promise<void> {
        const { error } = await supabase.from('team_notes').update(noteData).eq('id', noteId);
        if (error) throw error;
    },

    async deleteNote(supabase: SupabaseClient, noteId: string): Promise<void> {
        const { error } = await supabase.from('team_notes').delete().eq('id', noteId);
        if (error) throw error;
    },

    async getLikeStatus(supabase: SupabaseClient, noteId: string, userId: string): Promise<boolean> {
        const { data } = await supabase
            .from('note_likes')
            .select('id')
            .eq('note_id', noteId)
            .eq('user_id', userId)
            .single();
        return !!data;
    },

    async toggleLike(
        supabase: SupabaseClient,
        noteId: string,
        userId: string,
        isCurrentlyLiked: boolean
    ): Promise<void> {
        if (isCurrentlyLiked) {
            const { error } = await supabase
                .from('note_likes')
                .delete()
                .eq('note_id', noteId)
                .eq('user_id', userId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('note_likes')
                .insert([{ note_id: noteId, user_id: userId }]);
            if (error) throw error;
        }
    },
};
