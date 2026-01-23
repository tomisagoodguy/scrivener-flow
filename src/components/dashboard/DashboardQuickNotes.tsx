'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { StickyNote, ListTodo } from 'lucide-react';
import { QuickNotesSection } from './quick-notes/QuickNotesSection';
import { QuickTasksSection } from './quick-notes/QuickTasksSection';

interface Note {
    id: string;
    title: string;
    content: string;
}

interface PersonalTask {
    id: string;
    content: string;
    due_date: string;
    is_completed: boolean;
    priority: string;
}

export default function DashboardQuickNotes() {
    const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');

    // Notes State
    const [notes, setNotes] = useState<Note[]>([{ id: 'default', title: '主要筆記', content: '' }]);
    const [activeNoteId, setActiveNoteId] = useState('default');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Tasks State
    const [tasks, setTasks] = useState<PersonalTask[]>([]);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');

    useEffect(() => {
        // Load initial settings
        const loadSettings = async () => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) {
                const saved = localStorage.getItem('dashboard_quick_notes');
                if (saved) setNotes(JSON.parse(saved));
                return;
            }

            // Load Notes
            const { data } = await supabase
                .from('user_settings')
                .select('dashboard_notes')
                .eq('user_id', user.id)
                .single();

            if (data?.dashboard_notes) {
                setNotes(data.dashboard_notes as any);
            }

            // Load Tasks
            fetchTasks(user.id);
        };
        loadSettings();

        // Task Realtime Subscription
        const channel = supabase
            .channel('dashboard-tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
                supabase.auth.getUser().then(({ data }) => {
                    if (data.user) fetchTasks(data.user.id);
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTasks = async (userId: string) => {
        const { data } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .eq('source_type', 'manual') // Only show manually added tasks here
            .order('due_date', { ascending: true });

        if (data) setTasks(data);
    };

    // Auto-save logic for Notes
    useEffect(() => {
        const saveToSupabase = async () => {
            setStatus('saving');
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                await supabase
                    .from('user_settings')
                    .upsert({ user_id: user.id, dashboard_notes: notes });
            } else {
                localStorage.setItem('dashboard_quick_notes', JSON.stringify(notes));
            }
            setLastSaved(new Date());
            setStatus('saved');
        };

        const timer = setTimeout(saveToSupabase, 2000);
        return () => clearTimeout(timer);
    }, [notes]);

    const handleAddTask = async () => {
        if (!newTaskContent.trim()) return;

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return alert('請先登入');

        // If no date selected, default to today 9:00 AM
        let targetDate = new Date();
        if (newTaskDate) {
            targetDate = new Date(newTaskDate);
        } else {
            targetDate.setHours(9, 0, 0, 0);
        }

        const newTask = {
            user_id: user.id,
            content: newTaskContent,
            due_date: targetDate.toISOString(),
            source_type: 'manual',
            is_completed: false,
            priority: 'not-urgent-important'
        };

        const { error } = await supabase.from('todos').insert([newTask]);

        if (error) {
            console.error('Add task error:', error);
            alert('新增失敗');
        } else {
            setNewTaskContent('');
            setNewTaskDate('');
            fetchTasks(user.id);
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
        await supabase.from('todos').update({ is_completed: !currentStatus }).eq('id', id);
    };

    const deleteTask = async (id: string) => {
        if (!confirm('確定刪除?')) return;
        // Optimistic update
        setTasks(prev => prev.filter(t => t.id !== id));
        await supabase.from('todos').delete().eq('id', id);
    };

    const updateActiveNoteContent = (newContent: string) => {
        setNotes((prev) => prev.map((n) => (n.id === activeNoteId ? { ...n, content: newContent } : n)));
    };

    const handlePhraseSelect = (phrase: string) => {
        const activeNote = notes.find((n) => n.id === activeNoteId);
        if (activeNote) {
            updateActiveNoteContent((activeNote.content || '') + '\n' + phrase);
        }
    };

    // Note handlers
    const handleAddNote = () => {
        const newId = crypto.randomUUID();
        const newNote = { id: newId, title: '新筆記', content: '' };
        setNotes([...notes, newNote]);
        setActiveNoteId(newId);
    };

    const handleDeleteNote = (id: string) => {
        if (notes.length <= 1) return;
        const newNotes = notes.filter((n) => n.id !== id);
        setNotes(newNotes);
        if (activeNoteId === id) setActiveNoteId(newNotes[0].id);
    };

    const handleRenameNote = (id: string, newTitle: string) => {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: newTitle } : n)));
    };

    return (
        <div className="flex flex-col h-full bg-card dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 transition-all">
            {/* Toolbar Header */}
            <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'notes'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <StickyNote className="w-3.5 h-3.5" />
                            隨手筆記
                        </button>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'tasks'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <ListTodo className="w-3.5 h-3.5" />
                            個人待辦
                        </button>
                    </div>

                    {activeTab === 'notes' && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {status === 'saving' && <span className="animate-pulse">儲存中...</span>}
                            {status === 'saved' && <span className="text-green-500">已儲存</span>}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {activeTab === 'notes' ? (
                    <QuickNotesSection
                        notes={notes}
                        activeNoteId={activeNoteId}
                        onSetActiveNoteId={setActiveNoteId}
                        onAddNote={handleAddNote}
                        onDeleteNote={handleDeleteNote}
                        onRenameNote={handleRenameNote}
                        onUpdateContent={updateActiveNoteContent}
                        onPhraseSelect={handlePhraseSelect}
                    />
                ) : (
                    <QuickTasksSection
                        tasks={tasks}
                        newTaskContent={newTaskContent}
                        onNewTaskContentChange={setNewTaskContent}
                        newTaskDate={newTaskDate}
                        onNewTaskDateChange={setNewTaskDate}
                        onAddTask={handleAddTask}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                    />
                )}
            </div>
        </div>
    );
}
