'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { noteService } from '@/services/noteService';
import { useRouter } from 'next/navigation';
import { Save, X, Tag, Folder } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import RichTextEditor dynamically (Client-side only)
const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center bg-slate-50 border rounded-lg">載入編輯器...</div>
});

interface NoteEditorProps {
    noteId?: string; // If provided, we're editing; otherwise, creating
}

export default function NoteEditor({ noteId }: NoteEditorProps) {
    const supabase = createClient();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!noteId) return;
        setLoading(true);
        noteService.getNote(supabase, noteId).then((data) => {
            if (data) {
                setTitle(data.title);
                setContent(data.content || '');
                setCategory(data.category ?? '');
                setTags(data.tags || []);
            } else {
                alert('找不到此筆記');
            }
            setLoading(false);
        }).catch((err) => {
            console.error('Error loading note:', err);
            alert('載入筆記失敗');
            setLoading(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId]);

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleSave = async () => {
        if (!title.trim()) { alert('請輸入標題'); return; }
        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { alert('請先登入'); return; }

            if (noteId) {
                await noteService.updateNote(supabase, noteId, { title: title.trim(), content, category, tags });
            } else {
                await noteService.createNote(supabase, { title: title.trim(), content, category, tags, author_id: user.id });
            }
            router.push('/knowledge');
        } catch (err) {
            console.error('Error saving note:', err);
            alert('儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-slate-600">載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">📝</span>
                        {noteId ? '編輯筆記' : '新增筆記'}
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <X size={18} />
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {isSaving ? '儲存中...' : noteId ? '更新' : '發布'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Title */}
                <div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="輸入標題..."
                        className="w-full text-3xl font-bold border-none outline-none bg-transparent placeholder:text-slate-300"
                    />
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4">
                    {/* Category */}
                    <div className="flex items-center gap-2">
                        <Folder size={16} className="text-slate-400" />
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="分類 (選填)"
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-40"
                        />
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Tag size={16} className="text-slate-400" />
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="新增標籤 (按 Enter)"
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                        <button
                            onClick={handleAddTag}
                            className="px-3 py-1.5 bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
                        >
                            新增
                        </button>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                >
                                    #{tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="hover:text-red-600"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rich Text Editor */}
                <div className="min-h-[400px]">
                    <RichTextEditor value={content} onChange={setContent} />
                </div>
            </div>
        </div>
    );
}
