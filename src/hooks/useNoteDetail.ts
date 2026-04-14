'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { noteService } from '@/services/noteService';
import { useRouter } from 'next/navigation';
import { TeamNote } from '@/components/knowledge/NoteCard';

interface UseNoteDetailReturn {
    note: TeamNote | null;
    loading: boolean;
    isLiked: boolean;
    currentUserId: string | null;
    deleteConfirm: boolean;
    handleLike: () => Promise<void>;
    handleDelete: () => Promise<void>;
}

export function useNoteDetail(noteId: string): UseNoteDetailReturn {
    const supabase = createClient();
    const router = useRouter();
    const [note, setNote] = useState<TeamNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    useEffect(() => {
        if (!noteId) return;
        setLoading(true);

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id ?? null);

            try {
                const data = await noteService.getNote(supabase, noteId);
                setNote(data);
            } catch (err) {
                console.error('Error loading note:', err);
                alert('載入筆記失敗');
            }

            if (user) {
                const liked = await noteService.getLikeStatus(supabase, noteId, user.id);
                setIsLiked(liked);
            }

            setLoading(false);
        };

        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId]);

    const handleLike = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('請先登入'); return; }

        try {
            await noteService.toggleLike(supabase, noteId, user.id, isLiked);
            setIsLiked(!isLiked);
            if (note) {
                setNote({ ...note, like_count: (note.like_count || 0) + (isLiked ? -1 : 1) });
            }
        } catch (err) {
            console.error('Like error:', err);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            setTimeout(() => setDeleteConfirm(false), 3000);
            return;
        }

        try {
            await noteService.deleteNote(supabase, noteId);
            router.push('/knowledge');
        } catch (err) {
            console.error('Error deleting note:', err);
            alert('刪除失敗');
        }
    };

    return { note, loading, isLiked, currentUserId, deleteConfirm, handleLike, handleDelete };
}
