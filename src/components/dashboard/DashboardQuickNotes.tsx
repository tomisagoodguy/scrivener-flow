'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RichTextEditor from '@/components/knowledge/RichTextEditor';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, Trash2, StickyNote, ListTodo } from 'lucide-react';

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
                    // Notes View
                    <div className="flex flex-1 overflow-hidden flex-col md:flex-row w-full">
                        <div className="w-full md:w-32 bg-slate-50/50 dark:bg-slate-900/50 border-r border-gray-100 dark:border-slate-800 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        onClick={() => setActiveNoteId(note.id)}
                                        className={`group relative px-3 py-2 rounded-lg cursor-pointer transition-all ${activeNoteId === note.id
                                                ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-600 font-bold'
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="text-xs truncate pr-4">{note.title}</div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteNote(note.id);
                                            }}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleAddNote}
                                className="m-2 p-2 text-xs font-bold text-center border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-purple-500 hover:text-purple-600 transition-all"
                            >
                                + 新增
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                            <input
                                value={notes.find((n) => n.id === activeNoteId)?.title || ''}
                                onChange={(e) => handleRenameNote(activeNoteId, e.target.value)}
                                className="w-full px-4 py-3 text-sm font-bold bg-transparent border-b border-gray-100 dark:border-slate-800 outline-none focus:bg-slate-50/50 transition-colors"
                                placeholder="筆記標題..."
                            />
                            <div className="flex-1 overflow-hidden">
                                <RichTextEditor
                                    value={notes.find((n) => n.id === activeNoteId)?.content || ''}
                                    onChange={updateActiveNoteContent}
                                />
                            </div>
                            {/* Phrases */}
                            <div className="h-10 border-t border-gray-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-slate-50/30 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">快速插入:</span>
                                {['待辦事項:', '會議記錄:', '客戶需求:', '重要提醒:', '電話記錄:'].map(phrase => (
                                    <button
                                        key={phrase}
                                        onClick={() => handlePhraseSelect(phrase)}
                                        className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                                    >
                                        {phrase}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    // Tasks View
                    <div className="flex flex-col w-full h-full bg-white dark:bg-slate-900">
                        {/* Task Input Area */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30">
                            <div className="flex gap-2 mb-2">
                                <input
                                    value={newTaskContent}
                                    onChange={(e) => setNewTaskContent(e.target.value)}
                                    placeholder="輸入待辦事項..."
                                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                />
                                <input
                                    type="datetime-local"
                                    value={newTaskDate}
                                    onChange={(e) => setNewTaskDate(e.target.value)}
                                    className="w-40 px-2 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <button
                                    onClick={handleAddTask}
                                    disabled={!newTaskContent.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                >
                                    新增
                                </button>
                            </div>
                        </div>

                        {/* Tasks List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {tasks.length === 0 ? (
                                <div className="text-center text-slate-400 py-8 text-xs">
                                    尚無待辦事項
                                </div>
                            ) : (
                                tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${task.is_completed
                                                ? 'bg-slate-50 border-transparent opacity-60'
                                                : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleTask(task.id, task.is_completed)}
                                            className={`flex-shrink-0 transition-colors ${task.is_completed ? 'text-green-500' : 'text-slate-300 hover:text-blue-500'}`}
                                        >
                                            {task.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium truncate ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                {task.content}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(task.due_date), 'MM/dd HH:mm', { locale: zhTW })}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
