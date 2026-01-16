'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Plus, Calendar, Clock, Edit2, Save, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// Ensure this matches your TodoTask definition or is compatible
interface ScheduleItem {
    id: string;
    content: string; // Map to title
    due_date: string; // ISO string
    priority: string;
    is_completed: boolean;
    type: string;
}

import { useRouter } from 'next/navigation';

export default function CaseScheduleManager({ caseId }: { caseId: string }) {
    const router = useRouter();
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    // New Item State
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editContent, setEditContent] = useState('');

    const fetchSchedule = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('case_id', caseId)
            .eq('is_deleted', false)
            .order('due_date', { ascending: true });

        if (data) {
            setScheduleItems(data as any[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSchedule();
    }, [caseId]);

    const handleAdd = async (e: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if (!date || !content) return;

        setIsSubmitting(true);

        // Combine date and time
        // If time is provided: YYYY-MM-DDTHH:mm
        // If not: YYYY-MM-DD (but standardizing on ISO)
        const dateTimeStr = time ? `${date}T${time}:00` : `${date}T00:00:00`;
        const taskType = time ? 'appointment' : 'personal'; // Distinguish by presence of time? Or just 'personal'

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('請先登入');
            setIsSubmitting(false);
            return;
        }

        const newItem = {
            case_id: caseId,
            content: content,
            due_date: new Date(dateTimeStr).toISOString(),
            // type: 'appointment', // Let's use 'appointment' for schedule items so they stand out
            source_type: 'manual',
            priority: 'urgent-important', // Schedule items imply importance
            is_completed: false,
            user_id: user.id
        };

        const { error } = await supabase.from('todos').insert([newItem]);

        if (error) {
            alert('新增失敗: ' + error.message);
        } else {
            setContent('');
            setDate('');
            setTime('');
            fetchSchedule();
            router.refresh(); // Refresh server components (Dashboard)
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        // Optimistic UI update: Remove immediately from view
        setScheduleItems(prev => prev.filter(item => item.id !== id));

        // Soft delete first
        const { error } = await supabase.from('todos').update({ is_deleted: true }).eq('id', id);

        if (error) {
            console.error('Soft delete error:', error);
            // Fallback to Hard delete if soft delete fails (e.g. column missing)
            const { error: hardError } = await supabase.from('todos').delete().eq('id', id);

            if (hardError) {
                console.error('Delete failed:', hardError);
                alert('刪除失敗，請檢查網路連線');
                // Revert UI change if really failed
                fetchSchedule();
            } else {
                router.refresh(); // Sync server components
            }
        } else {
            router.refresh(); // Sync server components
        }
    };

    const startEdit = (item: ScheduleItem) => {
        setEditingId(item.id);
        const d = new Date(item.due_date);
        setEditDate(format(d, 'yyyy-MM-dd'));
        setEditTime(format(d, 'HH:mm'));
        setEditContent(item.content);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDate('');
        setEditTime('');
        setEditContent('');
    };

    const saveEdit = async (id: string) => {
        const dateTimeStr = editTime ? `${editDate}T${editTime}:00` : `${editDate}T00:00:00`;

        const { error } = await supabase.from('todos').update({
            content: editContent,
            due_date: new Date(dateTimeStr).toISOString()
        }).eq('id', id);

        if (error) {
            alert('更新失敗');
        } else {
            setEditingId(null);
            fetchSchedule();
            router.refresh();
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black text-indigo-600 flex items-center gap-3">
                <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">📅</span>
                案件行事曆與備忘 (Schedule)
            </h3>

            {/* Add Form Replacement (Div to prevent nesting) */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4" onKeyDown={(e) => e.key === 'Enter' && handleAdd(e)}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-indigo-400">日期</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-indigo-400">時間 (選填)</label>
                        <input
                            type="time"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <div className="space-y-1 flex-grow">
                        <label className="text-xs font-bold text-indigo-400">行程內容 / 備忘</label>
                        <input
                            type="text"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="例如：下午 2 點與代書確認..."
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hovering:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm"
                        >
                            <Plus size={16} />
                            新增
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="text-center text-slate-400 text-sm py-4">載入中...</div>
                ) : scheduleItems.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-4 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        目前沒有安排特定行程
                    </div>
                ) : (
                    scheduleItems.map(item => {
                        const isEditing = editingId === item.id;
                        const dateObj = new Date(item.due_date);

                        // Check if time is "00:00" or equivalent, likely date-only
                        const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0;

                        if (isEditing) {
                            return (
                                <div key={item.id} className="bg-white p-3 rounded-xl border-2 border-indigo-200 shadow-sm flex flex-col md:flex-row gap-3 animate-fade-in">
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={e => setEditDate(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                                    />
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={e => setEditTime(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        className="flex-grow bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => saveEdit(item.id)} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200"><Save size={16} /></button>
                                        <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><X size={16} /></button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={item.id} className="group bg-white hover:bg-indigo-50/30 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 shadow-sm flex items-center justify-between transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center min-w-[60px] border-r border-slate-100 pr-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase">{format(dateObj, 'MMM', { locale: zhTW })}</span>
                                        <span className="text-xl font-black text-indigo-600 leading-none">{format(dateObj, 'd')}</span>
                                        <span className="text-[10px] text-slate-400">{format(dateObj, 'EEE', { locale: zhTW })}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            {hasTime && (
                                                <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {format(dateObj, 'HH:mm')}
                                                </span>
                                            )}
                                            {item.is_completed && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 rounded">已完成</span>}
                                        </div>
                                        <p className="font-bold text-slate-700">{item.content}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(item)} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-full transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
