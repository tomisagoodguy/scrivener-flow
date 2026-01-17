'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2, Heart, MessageCircle, Eye, Tag, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { TeamNote } from './NoteCard';

interface NoteDetailProps {
    noteId: string;
}

export default function NoteDetail({ noteId }: NoteDetailProps) {
    const router = useRouter();
    const [note, setNote] = useState<TeamNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        loadNote();
        checkIfLiked();
    }, [noteId]);

    const loadNote = async () => {
        if (!noteId) return;
        setLoading(true);

        try {
            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            // Load note
            const { data, error } = await supabase
                .from('team_notes')
                .select('*')
                .eq('id', noteId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Note not found
                    console.log('Note not found:', noteId);
                    setNote(null);
                } else {
                    console.error('Error loading note:', JSON.stringify(error, null, 2));
                    alert(`載入筆記失敗: ${error.message || '未知錯誤'}`);
                }
            } else if (data) {
                setNote({
                    ...data,
                    author_name: '匿名',
                });
            }
        } catch (err) {
            console.error('Unexpected error in loadNote:', err);
        }

        setLoading(false);
    };

    const checkIfLiked = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('note_likes')
            .select('id')
            .eq('note_id', noteId)
            .eq('user_id', user.id)
            .single();

        setIsLiked(!!data);
    };

    const handleLike = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            alert('請先登入');
            return;
        }

        if (isLiked) {
            // Unlike
            await supabase.from('note_likes').delete().eq('note_id', noteId).eq('user_id', user.id);
            setIsLiked(false);
            if (note) {
                setNote({ ...note, like_count: (note.like_count || 0) - 1 });
            }
        } else {
            // Like
            await supabase.from('note_likes').insert([{ note_id: noteId, user_id: user.id }]);
            setIsLiked(true);
            if (note) {
                setNote({ ...note, like_count: (note.like_count || 0) + 1 });
            }
        }
    };

    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const handleDelete = async () => {
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            setTimeout(() => setDeleteConfirm(false), 3000); // Reset after 3 seconds
            return;
        }

        console.log('Deleting note:', noteId);
        const { error } = await supabase.from('team_notes').delete().eq('id', noteId);

        if (error) {
            console.error('Error deleting note:', error);
            alert('刪除失敗: ' + error.message);
        } else {
            router.push('/knowledge');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">📖</div>
                    <p className="text-slate-600">載入中...</p>
                </div>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-slate-600">筆記不存在</p>
                    <button
                        onClick={() => router.push('/knowledge')}
                        className="mt-4 text-indigo-600 hover:text-indigo-700"
                    >
                        返回知識庫
                    </button>
                </div>
            </div>
        );
    }

    const canEdit = !!currentUserId;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        返回
                    </button>
                    {canEdit && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push(`/knowledge/${noteId}/edit`)}
                                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Edit2 size={16} />
                                編輯
                            </button>
                            <button
                                onClick={handleDelete}
                                className={`px-4 py-2 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors ${deleteConfirm ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600'
                                    }`}
                            >
                                <Trash2 size={16} />
                                {deleteConfirm ? '確定刪除?' : '刪除'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-6">
                <article className="bg-white rounded-xl border border-slate-200 p-8">
                    {/* Title & Meta */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-black text-slate-800 mb-4">{note.title}</h1>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <User size={16} />
                                <span>{note.author_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                <span>
                                    {format(new Date(note.created_at), 'yyyy/MM/dd HH:mm', {
                                        locale: zhTW,
                                    })}
                                </span>
                            </div>
                            {note.category && (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                    {note.category}
                                </span>
                            )}
                        </div>

                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {note.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1"
                                    >
                                        <Tag size={10} />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="prose prose-slate max-w-none mb-8">
                        <div
                            className="rich-text-content"
                            dangerouslySetInnerHTML={{ __html: note.content || '無內容' }}
                        />
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                            {/* 
                            <span className="flex items-center gap-2">
                                <Eye size={16} />
                                {note.view_count || 0} 次瀏覽
                            </span>
                            <span className="flex items-center gap-2">
                                <MessageCircle size={16} />
                                {note.comment_count || 0} 則評論
                            </span>
                             */}
                        </div>
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isLiked
                                ? 'bg-red-50 text-red-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                            {note.like_count || 0}
                        </button>
                    </div>
                </article>

                {/* Comments Section (Placeholder) */}
                {/* Comments Section (Disabled) */}
                {/* 
                <div className="mt-6 bg-white rounded-xl border border-slate-200 p-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MessageCircle size={20} />
                        評論 ({note.comment_count || 0})
                    </h3>
                    <div className="text-center text-slate-400 py-8">
                        <p>評論功能即將推出...</p>
                    </div>
                </div> 
                */}
            </div>
        </div>
    );
}
