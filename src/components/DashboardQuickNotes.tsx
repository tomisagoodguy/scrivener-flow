'use client';

import React, { useState, useEffect } from 'react';
import QuickNotes from './QuickNotes';
import { supabase } from '@/lib/supabaseClient';

interface Note {
    id: string;
    title: string;
    content: string;
}

export default function DashboardQuickNotes() {
    const [notes, setNotes] = useState<Note[]>([{ id: 'default', title: '主要筆記', content: '' }]);
    const [activeNoteId, setActiveNoteId] = useState('default');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Load from Supabase on mount
    useEffect(() => {
        const loadNotes = async () => {
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

                if (error) {
                    console.error('Error loading notes:', error);
                    return;
                }

                if (data && data.scratchpad_content) {
                    try {
                        // Try to parse as JSON array of notes
                        const parsed = JSON.parse(data.scratchpad_content);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setNotes(parsed);
                            setActiveNoteId(parsed[0].id);
                        } else {
                            // If parsed but not valid array (unlikely), or just valid string
                            throw new Error('Not an array');
                        }
                    } catch {
                        // Maintain backward compatibility: treat as single note list
                        // If it's just raw text, put it in the default note
                        if (typeof data.scratchpad_content === 'string' && data.scratchpad_content.trim() !== '') {
                            setNotes([{ id: 'default', title: '主要筆記', content: data.scratchpad_content }]);
                        }
                    }
                }
            } catch (err) {
                console.error('Load notes exception:', err);
            }
        };

        loadNotes();
    }, []);

    // Auto-save logic with debounce
    useEffect(() => {
        const saveNotes = async () => {
            setStatus('saving');
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                // Serialize whole notes array to string for storage
                const contentToSave = JSON.stringify(notes);

                if (!user) {
                    // Fallback to local storage if no user
                    localStorage.setItem('dashboard_scratchpad', contentToSave);
                    setLastSaved(new Date());
                    setStatus('saved');
                    return;
                }

                const { error } = await supabase.from('user_settings').upsert(
                    {
                        user_id: user.id,
                        scratchpad_content: contentToSave,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                );

                if (error) throw error;

                setLastSaved(new Date());
                setStatus('saved');
            } catch (err) {
                console.error('Save notes error:', err);
                setStatus('error');
            }
        };

        const timer = setTimeout(() => {
            saveNotes();
        }, 2000);

        return () => clearTimeout(timer);
    }, [notes]);

    const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

    const updateActiveNoteContent = (newContent: string) => {
        setNotes((prev) => prev.map((n) => (n.id === activeNoteId ? { ...n, content: newContent } : n)));
    };

    const handlePhraseSelect = (phrase: string) => {
        updateActiveNoteContent(activeNote.content ? `${activeNote.content}\n${phrase}` : phrase);
    };

    const handleAddNote = () => {
        const newId = Date.now().toString();
        const newNote = { id: newId, title: '新筆記', content: '' };
        setNotes([...notes, newNote]);
        setActiveNoteId(newId);
    };

    const handleDeleteNote = (id: string) => {
        if (notes.length <= 1) {
            alert('至少需保留一個筆記！');
            return;
        }
        if (window.confirm('確定要刪除此筆記嗎？')) {
            const newNotes = notes.filter((n) => n.id !== id);
            setNotes(newNotes);
            if (activeNoteId === id) {
                setActiveNoteId(newNotes[0].id);
            }
        }
    };

    const handleRenameNote = (id: string, newTitle: string) => {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: newTitle } : n)));
    };

    return (
        <div className="flex flex-col h-full bg-card dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 transition-all">
            {/* Toolbar Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                            個人工作筆記
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div
                                className={`w-1.5 h-1.5 rounded-full ${status === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}
                            />
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                                {status === 'saving'
                                    ? '儲存中...'
                                    : `已同步 ${lastSaved?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 text-xl">
                    <a
                        href="/banks"
                        className="quick-link-btn text-[#4B5E65] dark:text-slate-300 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-[#4B5E65]"
                    >
                        🏦 銀行庫
                    </a>
                    <a
                        href="/clauses"
                        className="quick-link-btn text-[#D49E6A] dark:text-amber-200 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-[#D49E6A]"
                    >
                        📜 條文庫
                    </a>
                    <a
                        href="/redemptions"
                        className="quick-link-btn text-[#9C7A5F] dark:text-orange-200 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-[#9C7A5F]"
                    >
                        💰 代償庫
                    </a>
                    <a
                        href="/cases"
                        className="quick-link-btn text-[#6B8E61] dark:text-emerald-300 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-[#6B8E61]"
                    >
                        📁 案件表
                    </a>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Tabs Sidebar */}
                <div className="w-full md:w-48 bg-gray-50/50 dark:bg-slate-950/20 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-800 p-2 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1 items-start no-scrollbar">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => setActiveNoteId(note.id)}
                            className={`group flex items-center w-full px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                                activeNoteId === note.id
                                    ? 'bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <input
                                className="bg-transparent border-none outline-none font-bold text-sm flex-1 cursor-pointer"
                                value={note.id === 'default' ? '主要筆記' : note.title}
                                onChange={(e) => {
                                    const newNotes = notes.map((n) =>
                                        n.id === note.id ? { ...n, title: e.target.value } : n
                                    );
                                    setNotes(newNotes);
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            />
                            {notes.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNote(note.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-all ml-2"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={handleAddNote}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm font-bold min-w-[140px] md:min-w-0 border border-dashed border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 mt-1"
                    >
                        <span>+</span> 新增頁籤
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white dark:bg-slate-900 relative">
                    <textarea
                        value={activeNote.content}
                        onChange={(e) => updateActiveNoteContent(e.target.value)}
                        placeholder="點擊此處開始輸入..."
                        className="w-full h-full p-6 resize-none outline-none text-gray-700 dark:text-slate-200 text-base leading-relaxed placeholder-gray-300 dark:placeholder-slate-600 bg-transparent"
                    />
                </div>
            </div>

            <style jsx>{`
                .quick-link-btn {
                    @apply px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 min-w-[90px] justify-center shadow-sm;
                }
            `}</style>
        </div>
    );
}
