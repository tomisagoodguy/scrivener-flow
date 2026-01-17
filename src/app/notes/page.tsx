'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SideNav } from '@/components/SideNav';
import { Header } from '@/components/Header';

interface Note {
    id: string;
    title: string;
    content: string;
    updated_at: string;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Load notes from User Settings (scratchpad_content)
    useEffect(() => {
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('user_settings')
                    .select('scratchpad_content')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (data?.scratchpad_content) {
                    try {
                        const parsed = JSON.parse(data.scratchpad_content);
                        if (Array.isArray(parsed)) {
                            setNotes(parsed);
                            if (parsed.length > 0) setActiveNoteId(parsed[0].id);
                        } else {
                            // Convert legacy string content to structured note
                            const legacyNote = {
                                id: 'default',
                                title: '主要筆記',
                                content: data.scratchpad_content,
                                updated_at: new Date().toISOString(),
                            };
                            setNotes([legacyNote]);
                            setActiveNoteId('default');
                        }
                    } catch {
                        const legacyNote = {
                            id: 'default',
                            title: '主要筆記',
                            content: data.scratchpad_content,
                            updated_at: new Date().toISOString(),
                        };
                        setNotes([legacyNote]);
                        setActiveNoteId('default');
                    }
                } else {
                    // Initialize with a blank note if nothing exists
                    const newNote = {
                        id: crypto.randomUUID(),
                        title: '新筆記',
                        content: '',
                        updated_at: new Date().toISOString(),
                    };
                    setNotes([newNote]);
                    setActiveNoteId(newNote.id);
                }
            } catch (err) {
                console.error('Failed to fetch notes:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotes();
    }, []);

    // Selection helper
    const activeNote = notes.find((n) => n.id === activeNoteId) || null;

    // Auto-save logic
    useEffect(() => {
        if (notes.length === 0 || isLoading) return;

        const timer = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;

                const { error } = await supabase.from('user_settings').upsert({
                    user_id: user.id,
                    scratchpad_content: JSON.stringify(notes),
                    updated_at: new Date().toISOString(),
                });

                if (error) throw error;
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (err) {
                console.error('Save failed:', err);
                setSaveStatus('error');
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [notes, isLoading]);

    const handleAddNote = () => {
        const newNote: Note = {
            id: crypto.randomUUID(),
            title: '未命名筆記',
            content: '',
            updated_at: new Date().toISOString(),
        };
        setNotes([newNote, ...notes]);
        setActiveNoteId(newNote.id);
    };

    const handleDeleteNote = (id: string) => {
        if (notes.length <= 1) return; // Keep at least one
        const filtered = notes.filter((n) => n.id !== id);
        setNotes(filtered);
        if (activeNoteId === id) {
            setActiveNoteId(filtered[0].id);
        }
    };

    const updateActiveNote = (updates: Partial<Note>) => {
        setNotes((prev) =>
            prev.map((n) => (n.id === activeNoteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
        );
    };

    const filteredNotes = notes.filter(
        (n) =>
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex bg-slate-50 min-h-screen">
            {/* Split Pane Layout */}
            <div className="flex-1 lg:pl-32 flex flex-col">
                <main className="flex-1 flex overflow-hidden h-[calc(100vh-120px)] mt-4 mb-4 mx-6">
                    {/* Left Sidebar - Note List */}
                    <div className="w-80 flex flex-col bg-white border border-slate-200 rounded-l-3xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">工作筆記</h2>
                                <button
                                    onClick={handleAddNote}
                                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    +
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                <input
                                    type="text"
                                    placeholder="搜尋筆記..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-400 text-sm italic">載入中...</div>
                            ) : filteredNotes.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                                    找不到相符的筆記
                                </div>
                            ) : (
                                filteredNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        onClick={() => setActiveNoteId(note.id)}
                                        className={`group p-4 rounded-2xl cursor-pointer transition-all duration-300 relative ${
                                            activeNoteId === note.id
                                                ? 'bg-blue-50 border border-blue-100 shadow-sm'
                                                : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <h3
                                                    className={`text-sm font-black truncate max-w-[180px] ${activeNoteId === note.id ? 'text-blue-700' : 'text-slate-700'}`}
                                                >
                                                    {note.title || '未命名筆記'}
                                                </h3>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteNote(note.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-slate-400 line-clamp-1">
                                                {note.content || '尚無內容...'}
                                            </p>
                                            <span className="text-[9px] text-slate-300 font-mono mt-1">
                                                {new Date(note.updated_at).toLocaleDateString('zh-TW')}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Pane - Editor */}
                    <div className="flex-1 flex flex-col bg-white border-y border-r border-slate-200 rounded-r-3xl overflow-hidden relative">
                        {activeNote ? (
                            <>
                                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
                                    <input
                                        type="text"
                                        value={activeNote.title}
                                        onChange={(e) => updateActiveNote({ title: e.target.value })}
                                        placeholder="輸入筆記標題..."
                                        className="text-2xl font-black text-slate-900 border-none outline-none placeholder:text-slate-200 w-full"
                                    />
                                    <div className="flex items-center gap-4 min-w-[120px] justify-end">
                                        {saveStatus === 'saving' && (
                                            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full animate-pulse">
                                                儲存中...
                                            </span>
                                        )}
                                        {saveStatus === 'saved' && (
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full">
                                                已儲存
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 font-mono hidden md:block">
                                            最後更新:{' '}
                                            {new Date(activeNote.updated_at).toLocaleTimeString('zh-TW', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <textarea
                                        value={activeNote.content}
                                        onChange={(e) => updateActiveNote({ content: e.target.value })}
                                        placeholder="在此處寫下任何重要事項..."
                                        className="w-full h-full p-8 resize-none outline-none text-slate-700 text-lg leading-relaxed placeholder:text-slate-200"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
                                <span className="text-6xl grayscale opacity-20">📝</span>
                                <p className="font-bold">選擇或建立一個新的工作筆記</p>
                            </div>
                        )}

                        {/* Decorative Background Element */}
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-slate-50 -z-10 rounded-full blur-3xl opacity-50" />
                    </div>
                </main>
            </div>
        </div>
    );
}
