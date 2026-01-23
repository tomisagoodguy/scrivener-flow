'use client';

import React from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react';

interface PersonalTask {
    id: string;
    content: string;
    due_date: string;
    is_completed: boolean;
    priority: string;
}

interface QuickTasksSectionProps {
    tasks: PersonalTask[];
    newTaskContent: string;
    onNewTaskContentChange: (content: string) => void;
    newTaskDate: string;
    onNewTaskDateChange: (date: string) => void;
    onAddTask: () => void;
    onToggleTask: (id: string, currentStatus: boolean) => void;
    onDeleteTask: (id: string) => void;
}

export function QuickTasksSection({
    tasks,
    newTaskContent,
    onNewTaskContentChange,
    newTaskDate,
    onNewTaskDateChange,
    onAddTask,
    onToggleTask,
    onDeleteTask
}: QuickTasksSectionProps) {
    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-slate-900">
            {/* Task Input Area */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30">
                <div className="flex gap-2 mb-2">
                    <input
                        value={newTaskContent}
                        onChange={(e) => onNewTaskContentChange(e.target.value)}
                        placeholder="輸入待辦事項..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                        onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
                    />
                    <input
                        type="datetime-local"
                        value={newTaskDate}
                        onChange={(e) => onNewTaskDateChange(e.target.value)}
                        className="w-40 px-2 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                        onClick={onAddTask}
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
                                onClick={() => onToggleTask(task.id, task.is_completed)}
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
                                onClick={() => onDeleteTask(task.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
