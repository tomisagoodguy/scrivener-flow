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

    // Filter State
    const [filter, setFilter] = useState<'all' | 'future' | 'today' | 'expired'>('future');

    const fetchSchedule = async () => {
        setLoading(true);

        // 計算 7 天前的日期 (保留最近的過期提醒,避免遺漏)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('case_id', caseId)
            .eq('is_deleted', false)
            .gte('due_date', sevenDaysAgo.toISOString()) // 只顯示 7 天內的提醒
            .order('due_date', { ascending: true });

        if (data) {
            // 只顯示手動新增的項目 (manual)，排除系統自動同步的 (system)
            setScheduleItems((data as any[]).filter(item => item.source_type === 'manual' || !item.source_type));
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

        const {
            data: { user },
        } = await supabase.auth.getUser();
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
            user_id: user.id,
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
        setScheduleItems((prev) => prev.filter((item) => item.id !== id));

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

        const { error } = await supabase
            .from('todos')
            .update({
                content: editContent,
                due_date: new Date(dateTimeStr).toISOString(),
            })
            .eq('id', id);

        if (error) {
            alert('更新失敗');
        } else {
            setEditingId(null);
            fetchSchedule();
            router.refresh();
        }
    };

    // Filter logic
    const getFilteredItems = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return scheduleItems.filter(item => {
            const dueDate = new Date(item.due_date);
            const itemDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            switch (filter) {
                case 'future':
                    return dueDate >= now;
                case 'today':
                    return itemDate.getTime() === today.getTime();
                case 'expired':
                    return dueDate < now && !item.is_completed;
                case 'all':
                default:
                    return true;
            }
        });
    };

    const filteredItems = getFilteredItems();

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black text-indigo-600 flex items-center gap-3">
                <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">📅</span>
                案件行事曆與備忘 (Schedule)
            </h3>

            {/* Add Form Replacement (Div to prevent nesting) */}
            <div
                className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd(e)}
            >
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-indigo-400">日期</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-indigo-400">時間 (選填)</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <div className="space-y-1 flex-grow">
                        <label className="text-xs font-bold text-indigo-400">行程內容 / 備忘</label>
                        <input
                            type="text"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="例如:下午 2 點與代書確認..."
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm transition-colors"
                        >
                            <Plus size={16} />
                            新增
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilter('future')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'future'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    🔮 未來
                </button>
                <button
                    onClick={() => setFilter('today')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'today'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    📅 今天
                </button>
                <button
                    onClick={() => setFilter('expired')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'expired'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    ⚠️ 已過期
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all'
                        ? 'bg-slate-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    📋 全部
                </button>
                <div className="ml-auto text-xs text-slate-400 flex items-center">
                    共 {filteredItems.length} 筆
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="text-center text-slate-400 text-sm py-4">載入中...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-4 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        {filter === 'future' && '目前沒有未來的行程'}
                        {filter === 'today' && '今天沒有安排行程'}
                        {filter === 'expired' && '沒有已過期的提醒'}
                        {filter === 'all' && '目前沒有安排特定行程'}
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        const isEditing = editingId === item.id;
                        const dateObj = new Date(item.due_date);
                        const now = new Date();
                        const isExpired = dateObj < now && !item.is_completed;

                        // Check if time is "00:00" or equivalent, likely date-only
                        const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0;

                        if (isEditing) {
                            return (
                                <div
                                    key={item.id}
                                    className="bg-white p-3 rounded-xl border-2 border-indigo-200 shadow-sm flex flex-col md:flex-row gap-3 animate-fade-in"
                                >
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
                                        className="flex-grow bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
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
                                key={item.id}
                                className={`group bg-white hover:bg-indigo-50/30 p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all ${isExpired
                                    ? 'border-red-200 bg-red-50/20'
                                    : 'border-slate-100 hover:border-indigo-100'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`flex flex-col items-center min-w-[60px] border-r pr-4 ${isExpired ? 'border-red-100' : 'border-slate-100'
                                        }`}>
                                        <span className={`text-xs font-bold uppercase ${isExpired ? 'text-red-400' : 'text-slate-400'
                                            }`}>
                                            {format(dateObj, 'MMM', { locale: zhTW })}
                                        </span>
                                        <span className={`text-xl font-black leading-none ${isExpired ? 'text-red-600' : 'text-indigo-600'
                                            }`}>
                                            {format(dateObj, 'd')}
                                        </span>
                                        <span className={`text-[10px] ${isExpired ? 'text-red-400' : 'text-slate-400'
                                            }`}>
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
                                        <p className={`font-bold ${isExpired ? 'text-red-700' : 'text-slate-700'
                                            }`}>{item.content}</p>
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
                    })
                )}
            </div>
        </div>
    );
}
