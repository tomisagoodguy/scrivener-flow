import React from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Clock, Edit2, Trash2, Save, X } from 'lucide-react';
import { ScheduleItem } from './types';

interface ScheduleItemCardProps {
    item: ScheduleItem;
    editingId: string | null;
    editDate: string;
    setEditDate: (val: string) => void;
    editTime: string;
    setEditTime: (val: string) => void;
    editContent: string;
    setEditContent: (val: string) => void;
    saveEdit: (id: string) => void;
    cancelEdit: () => void;
    startEdit: (item: ScheduleItem) => void;
    handleDelete: (id: string) => void;
}

export function ScheduleItemCard({
    item,
    editingId,
    editDate, setEditDate,
    editTime, setEditTime,
    editContent, setEditContent,
    saveEdit,
    cancelEdit,
    startEdit,
    handleDelete
}: ScheduleItemCardProps) {
    const isEditing = editingId === item.id;
    const dateObj = new Date(item.due_date);
    const now = new Date();
    const isExpired = dateObj < now && !item.is_completed;
    const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0;

    if (isEditing) {
        return (
            <div className="bg-white p-3 rounded-xl border-2 border-indigo-200 shadow-sm flex flex-col md:flex-row gap-3 animate-fade-in">
                <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                />
                <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                />
                <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="grow bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                    <button
                        onClick={() => saveEdit(item.id)}
                        className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                    >
                        <Save size={16} />
                    </button>
                    <button
                        onClick={cancelEdit}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`group bg-white hover:bg-indigo-50/30 p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all ${isExpired
                ? 'border-red-200 bg-red-50/20'
                : 'border-slate-100 hover:border-indigo-100'
                }`}
        >
            <div className="flex items-center gap-4">
                <div className={`flex flex-col items-center min-w-[60px] border-r pr-4 ${isExpired ? 'border-red-100' : 'border-slate-100'}`}>
                    <span className={`text-xs font-bold uppercase ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                        {format(dateObj, 'MMM', { locale: zhTW })}
                    </span>
                    <span className={`text-xl font-black leading-none ${isExpired ? 'text-red-600' : 'text-indigo-600'}`}>
                        {format(dateObj, 'd')}
                    </span>
                    <span className={`text-[10px] ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                        {format(dateObj, 'EEE', { locale: zhTW })}
                    </span>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        {hasTime && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isExpired
                                ? 'bg-red-100 text-red-600'
                                : 'bg-indigo-100 text-indigo-600'
                                }`}>
                                <Clock size={10} />
                                {format(dateObj, 'HH:mm')}
                            </span>
                        )}
                        {item.is_completed && (
                            <span className="text-[10px] bg-green-100 text-green-600 px-1.5 rounded">
                                已完成
                            </span>
                        )}
                        {isExpired && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">
                                已過期
                            </span>
                        )}
                    </div>
                    <p className={`font-bold ${isExpired ? 'text-red-700' : 'text-slate-700'}`}>
                        {item.content}
                    </p>
                </div>
            </div>
            <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => startEdit(item)}
                    className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-full transition-colors"
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
