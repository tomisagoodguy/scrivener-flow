'use client';

import { useState } from 'react';
import { TodoListView } from './TodoListView';
import { TodoCalendarView } from './TodoCalendarView';
import { TodoWeekView } from './TodoWeekView';
import { List, Calendar, CalendarDays } from 'lucide-react';
import { useTodoSync } from './hooks/useTodoSync';
import { RapidEventInput } from './RapidEventInput';

const TodoContainer = () => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'week'>('list');

    const { tasks, loading, toggleTask, deleteTodo, addManualTodo } = useTodoSync();

    const now = new Date();
    const in1Day = new Date(now.getTime() + 86400000);
    const in3Days = new Date(now.getTime() + 3 * 86400000);
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        ✅ 智慧待辦中心
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium">
                        {loading ? '...' : `${tasks.filter((t) => !t.isCompleted).length} 待辦`}
                    </span>

                    {!loading && (
                        <div className="hidden md:flex gap-1 ml-2 text-[10px] text-slate-500 font-medium border-l border-slate-200 pl-2">
                            <div className="flex items-center gap-1" title="未來 24 小時">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                1天:{' '}
                                {tasks.filter((t) => !t.isCompleted && new Date(t.date) <= in1Day && new Date(t.date) >= now).length}
                            </div>
                            <div className="flex items-center gap-1" title="未來 3 天">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                3天:{' '}
                                {tasks.filter((t) => !t.isCompleted && new Date(t.date) <= in3Days && new Date(t.date) >= now).length}
                            </div>
                            <div className="flex items-center gap-1" title="未來 7 天">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                7天:{' '}
                                {tasks.filter((t) => !t.isCompleted && new Date(t.date) <= in7Days && new Date(t.date) >= now).length}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        title="條列"
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        title="未來七天"
                    >
                        <CalendarDays className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        title="月曆"
                    >
                        <Calendar className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 置頂常駐輸入列 */}
            <RapidEventInput onAdd={addManualTodo} persistent />

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">載入中...</div>
                ) : (
                    <>
                        {viewMode === 'list' && (
                            <TodoListView tasks={tasks} onToggle={toggleTask} onDelete={deleteTodo} />
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
    );
};

export default TodoContainer;
