'use client';

import { useState } from 'react';
import { TodoTask } from './types';
import { TodoListView } from './TodoListView';
import { TodoMatrixView } from './TodoMatrixView';
import { TodoCalendarView } from './TodoCalendarView';
import { TodoWeekView } from './TodoWeekView';
import { List, LayoutGrid, Calendar, Plus, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { useTodoSync } from './hooks/useTodoSync';

const TodoContainer = () => {
    const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'calendar' | 'week'>('list');
    const [showAdd, setShowAdd] = useState(false);
    const [newTodoContent, setNewTodoContent] = useState('');
    const [newTodoDate, setNewTodoDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

    const { tasks, loading, toggleTask, deleteTodo, addManualTodo } = useTodoSync();

    const handleAddTodo = async () => {
        await addManualTodo(newTodoContent, newTodoDate);
        setNewTodoContent('');
        setShowAdd(false);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        ✅ 智慧待辦中心
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium">
                        {loading ? '...' : `${tasks.filter((t) => !t.isCompleted).length} 待辦`}
                    </span>

                    {/* Future Stats */}
                    {!loading && (
                        <div className="hidden md:flex gap-1 ml-2 text-[10px] text-slate-500 font-medium border-l border-slate-200 pl-2">
                            <div className="flex items-center gap-1" title="未來 24 小時">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                1天:{' '}
                                {
                                    tasks.filter(
                                        (t) =>
                                            !t.isCompleted &&
                                            new Date(t.date) <= new Date(Date.now() + 86400000) &&
                                            new Date(t.date) >= new Date()
                                    ).length
                                }
                            </div>
                            <div className="flex items-center gap-1" title="未來 3 天">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                3天:{' '}
                                {
                                    tasks.filter(
                                        (t) =>
                                            !t.isCompleted &&
                                            new Date(t.date) <= new Date(Date.now() + 3 * 86400000) &&
                                            new Date(t.date) >= new Date()
                                    ).length
                                }
                            </div>
                            <div className="flex items-center gap-1" title="未來 7 天">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                7天:{' '}
                                {
                                    tasks.filter(
                                        (t) =>
                                            !t.isCompleted &&
                                            new Date(t.date) <= new Date(Date.now() + 7 * 86400000) &&
                                            new Date(t.date) >= new Date()
                                    ).length
                                }
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'} `}
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'matrix' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'} `}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'} `}
                        title="未來七天"
                    >
                        <CalendarDays className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'} `}
                    >
                        <Calendar className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400">載入中...</div>
                    ) : (
                        <>
                            {viewMode === 'list' && (
                                <TodoListView tasks={tasks} onToggle={toggleTask} onDelete={deleteTodo} />
                            )}
                            {viewMode === 'matrix' && (
                                <TodoMatrixView tasks={tasks} onToggle={toggleTask} onDelete={deleteTodo} />
                            )}
                            {viewMode === 'week' && (
                                <TodoWeekView tasks={tasks} onToggle={toggleTask} onDelete={deleteTodo} />
                            )}
                            {viewMode === 'calendar' && (
                                <TodoCalendarView tasks={tasks} onToggle={toggleTask} onDelete={deleteTodo} />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Quick Add */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
                {showAdd ? (
                    <div className="flex gap-2 flex-col">
                        <div className="flex gap-2 items-center">
                            <textarea
                                autoFocus
                                rows={3}
                                value={newTodoContent}
                                onChange={(e) => setNewTodoContent(e.target.value)}
                                placeholder="輸入待辦事項... (可多行)"
                                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                            <div className="relative">
                                <input
                                    type="datetime-local"
                                    value={newTodoDate}
                                    onChange={(e) => setNewTodoDate(e.target.value)}
                                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-40"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAdd(false)} className="text-slate-500 px-3 py-1.5 text-xs">
                                取消
                            </button>
                            <button
                                onClick={handleAddTodo}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                            >
                                新增事項
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setNewTodoDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                            setShowAdd(true);
                        }}
                        className="w-full py-2 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新增個人隨記 (Quick Add)
                    </button>
                )}
            </div>
        </div>
    );
};

export default TodoContainer;
