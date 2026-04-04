'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { StickyNote, ListTodo } from 'lucide-react';
import { QuickNotesSection } from './quick-notes/QuickNotesSection';
import { QuickTasksSection } from './quick-notes/QuickTasksSection';
import { todoService, ManualTodo } from '@/services/todoService';
import { dashboardNotesService, DashboardNote } from '@/services/dashboardNotesService';

type Note = DashboardNote;
type PersonalTask = ManualTodo;

export default function DashboardQuickNotes() {
    const supabase = createClient();
    const { user } = useAuthUser();
    const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');

    // Notes State
    const [notes, setNotes] = useState<Note[]>([{ id: 'default', title: '主要筆記', content: '' }]);
    const [activeNoteId, setActiveNoteId] = useState('default');
    const [, setLastSaved] = useState<Date | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Tasks State
    const [tasks, setTasks] = useState<PersonalTask[]>([]);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');

    const fetchTasks = async (userId: string) => {
        const data = await todoService.fetchManualTodos(supabase, userId);
        setTasks(data);
    };

    useEffect(() => {
        if (user === undefined) return; // still loading

        if (!user) {
            const saved = localStorage.getItem('dashboard_quick_notes');
            if (saved) {
                const parsed = JSON.parse(saved) as Note[];
                queueMicrotask(() => setNotes(parsed));
            }
            return;
        }

        // Load Notes
        dashboardNotesService.loadDashboardNotes(supabase, user.id).then((data) => {
            if (data) setNotes(data);
        });

        // Load Tasks
        queueMicrotask(() => fetchTasks(user.id));

        // Task Realtime Subscription
        const channel = todoService.subscribeToTodos(supabase, user.id, () => {
            fetchTasks(user.id);
        });

        return () => {
            supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Auto-save logic for Notes
    useEffect(() => {
        const save = async () => {
            setStatus('saving');
            try {
                if (user) {
                    await dashboardNotesService.saveDashboardNotes(supabase, user.id, notes);
                } else {
                    localStorage.setItem('dashboard_quick_notes', JSON.stringify(notes));
                }
                setLastSaved(new Date());
                setStatus('saved');
            } catch {
                setStatus('error');
            }
        };

        const timer = setTimeout(save, 2000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notes, user]);

    const handleAddTask = async () => {
        if (!newTaskContent.trim()) return;
        if (!user) return alert('請先登入');

        let targetDate = new Date();
        if (newTaskDate) {
            targetDate = new Date(newTaskDate);
        } else {
            targetDate.setHours(9, 0, 0, 0);
        }

        try {
            await todoService.createTodo(supabase, {
                user_id: user.id,
                content: newTaskContent,
                due_date: targetDate.toISOString(),
                source_type: 'manual',
                is_completed: false,
                priority: 'not-urgent-important',
            });
            setNewTaskContent('');
            setNewTaskDate('');
            fetchTasks(user.id);
        } catch (err) {
            console.error('Add task error:', err);
            alert('新增失敗');
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
        await todoService.toggleTodo(supabase, id, currentStatus);
    };

    const deleteTask = async (id: string) => {
        if (!confirm('確定刪除?')) return;
        // Optimistic update
        setTasks(prev => prev.filter(t => t.id !== id));
        await todoService.deleteTodo(supabase, id);
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
