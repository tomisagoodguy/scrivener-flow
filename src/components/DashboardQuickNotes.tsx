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
                const { data: { user } } = await supabase.auth.getUser();
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
                const { data: { user } } = await supabase.auth.getUser();
                // Serialize whole notes array to string for storage
                const contentToSave = JSON.stringify(notes);

                if (!user) {
                    // Fallback to local storage if no user
                    localStorage.setItem('dashboard_scratchpad', contentToSave);
                    setLastSaved(new Date());
                    setStatus('saved');
                    return;
                }

                const { error } = await supabase
                    .from('user_settings')
                    .upsert({
                        user_id: user.id,
                        scratchpad_content: contentToSave,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

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

    const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

    const updateActiveNoteContent = (newContent: string) => {
        setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: newContent } : n));
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
            const newNotes = notes.filter(n => n.id !== id);
            setNotes(newNotes);
            if (activeNoteId === id) {
                setActiveNoteId(newNotes[0].id);
            }
        }
    };

    const handleRenameNote = (id: string, newTitle: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, title: newTitle } : n));
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            {/* Header Section */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">工作手札 & 快速入口</h3>
                        <p className="text-xs text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${status === 'saved' ? 'bg-emerald-500' : status === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            {status === 'saving' && '儲存中...'}
                            {status === 'saved' && lastSaved && `已同步 ${lastSaved.toLocaleTimeString()}`}
                            {status === 'error' && '同步失敗'}
                            {status === 'idle' && !lastSaved && '準備就緒'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <a href="/banks" className="quick-link-btn group border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        <span className="text-lg group-hover:scale-110 transition-transform">🏦</span>
                        <span>銀行庫</span>
                    </a>
                    <a href="/clauses" className="quick-link-btn group border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                        <span className="text-lg group-hover:scale-110 transition-transform">📜</span>
                        <span>條文庫</span>
                    </a>
                    <a href="/redemptions" className="quick-link-btn group border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100">
                        <span className="text-lg group-hover:scale-110 transition-transform">💰</span>
                        <span>代償庫</span>
                    </a>
                    <a href="/cases" className="quick-link-btn group border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
                        <span className="text-lg group-hover:scale-110 transition-transform">📂</span>
                        <span>案件表</span>
                    </a>
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-56 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 flex flex-row md:flex-col gap-1 p-2 overflow-x-auto md:overflow-y-auto scrollbar-hide">
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => setActiveNoteId(note.id)}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all shrink-0 min-w-[140px] md:min-w-0 border ${activeNoteId === note.id
                                ? 'bg-white border-gray-200 text-gray-900 shadow-sm font-bold'
                                : 'border-transparent text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
                                }`}
                        >
                            <input
                                type="text"
                                value={note.title}
                                onChange={(e) => handleRenameNote(note.id, e.target.value)}
                                className={`bg-transparent border-none outline-none text-sm w-full cursor-pointer focus:cursor-text truncate ${activeNoteId === note.id ? 'font-bold' : 'font-medium'}`}
                                onClick={(e) => {
                                    if (activeNoteId === note.id) e.stopPropagation();
                                }}
                            />
                            {notes.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNote(note.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all ml-2"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={handleAddNote}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm font-bold min-w-[140px] md:min-w-0 border border-dashed border-gray-300 hover:border-gray-400 mt-1"
                    >
                        <span>+</span> 新增頁籤
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white relative">
                    <textarea
                        value={activeNote.content}
                        onChange={(e) => updateActiveNoteContent(e.target.value)}
                        placeholder="點擊此處開始輸入..."
                        className="w-full h-full p-6 resize-none outline-none text-gray-700 text-base leading-relaxed placeholder-gray-300"
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
