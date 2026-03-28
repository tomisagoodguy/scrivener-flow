'use client';

import { useState } from 'react';
import { TodoListView } from './TodoListView';
import { TodoMatrixView } from './TodoMatrixView';
import { TodoCalendarView } from './TodoCalendarView';
import { TodoWeekView } from './TodoWeekView';
import { List, LayoutGrid, Calendar, Plus, CalendarDays, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useTodoSync } from './hooks/useTodoSync';

const TodoContainer = () => {
    const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'calendar' | 'week'>('list');
    const [showAdd, setShowAdd] = useState(false);
    const [newTodoContent, setNewTodoContent] = useState('');
    const [newTodoDate, setNewTodoDate] = useState('');
    const [newTodoEndDate, setNewTodoEndDate] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);

    const { tasks, loading, toggleTask, deleteTodo, addManualTodo } = useTodoSync();

    const now = new Date();
    const in1Day = new Date(now.getTime() + 86400000);
    const in3Days = new Date(now.getTime() + 3 * 86400000);
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    const handleAddTodo = async () => {
        await addManualTodo(newTodoContent, newTodoDate, newTodoEndDate || undefined, isAllDay);
        setNewTodoContent('');
        setNewTodoEndDate('');
        setIsAllDay(false);
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
                                            new Date(t.date) <= in1Day &&
                                            new Date(t.date) >= now
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
                                            new Date(t.date) <= in3Days &&
                                            new Date(t.date) >= now
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
                                            new Date(t.date) <= in7Days &&
                                            new Date(t.date) >= now
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
            <div className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                {showAdd ? (
                    <div className="rounded-b-2xl overflow-hidden">
                        {/* 標題列 */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide uppercase">新增事件</span>
                            <button
                                onClick={() => setShowAdd(false)}
                                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                aria-label="關閉"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        {/* 標題輸入 — 仿 Google Calendar 無框底線風格 */}
                        <div className="px-4 pb-3">
                            <input
                                autoFocus
                                type="text"
                                value={newTodoContent}
                                onChange={(e) => setNewTodoContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTodo();
                                    if (e.key === 'Escape') setShowAdd(false);
                                }}
                                placeholder="新增標題"
                                className="w-full text-[15px] font-medium text-slate-800 dark:text-slate-100 bg-transparent border-0 border-b-2 border-blue-500 focus:outline-none pb-1.5 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            />
                        </div>

                        {/* 日期 / 時間列 */}
                        <div className="px-4 py-2 flex items-start gap-3 border-t border-slate-100 dark:border-slate-700/60">
                            <Clock className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                {/* 開始 → 結束 */}
                                <div className="flex items-center flex-wrap gap-1">
                                    <input
                                        type={isAllDay ? 'date' : 'datetime-local'}
                                        value={newTodoDate}
                                        onChange={(e) => setNewTodoDate(e.target.value)}
                                        className="text-sm text-blue-600 dark:text-blue-400 bg-transparent border-0 focus:outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-1.5 py-0.5 -ml-1.5 cursor-pointer transition-colors"
                                    />
                                    <span className="text-slate-300 dark:text-slate-600 text-xs">–</span>
                                    <input
                                        type={isAllDay ? 'date' : 'datetime-local'}
                                        value={newTodoEndDate}
                                        onChange={(e) => setNewTodoEndDate(e.target.value)}
                                        className="text-sm text-blue-600 dark:text-blue-400 bg-transparent border-0 focus:outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-1.5 py-0.5 cursor-pointer transition-colors placeholder:text-slate-300"
                                        placeholder="結束時間"
                                    />
                                </div>

                                {/* 全天 toggle — iOS 風格 */}
                                <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                                    <button
                                        role="switch"
                                        aria-checked={isAllDay}
                                        type="button"
                                        onClick={() => {
                                            const next = !isAllDay;
                                            setIsAllDay(next);
                                            if (next && newTodoDate.includes('T')) {
                                                setNewTodoDate(newTodoDate.split('T')[0]);
                                                if (newTodoEndDate) setNewTodoEndDate(newTodoEndDate.split('T')[0]);
                                            } else if (!next && newTodoDate && !newTodoDate.includes('T')) {
                                                setNewTodoDate(newTodoDate + 'T09:00');
                                                if (newTodoEndDate) setNewTodoEndDate(newTodoEndDate + 'T18:00');
                                            }
                                        }}
                                        className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isAllDay ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isAllDay ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
                                        />
                                    </button>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">全天</span>
                                </label>
                            </div>
                        </div>

                        {/* 操作按鈕列 */}
                        <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowAdd(false)}
                                className="px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAddTodo}
                                disabled={!newTodoContent.trim() || !newTodoDate}
                                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full shadow-sm transition-colors"
                            >
                                儲存
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setNewTodoDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                            setShowAdd(true);
                        }}
                        className="w-full py-3 px-4 flex items-center gap-3 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-colors shrink-0">
                            <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-sm group-hover:text-blue-500 transition-colors">新增事件</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default TodoContainer;
