import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { syncTodoToCalendar } from '@/app/actions/calendarSync';
import { ScheduleItem, FilterType } from './types';
import { format } from 'date-fns';

export function useCaseSchedule(caseId: string) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('future');

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

    const fetchSchedule = useCallback(async () => {
        setLoading(true);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('case_id', caseId)
            .eq('is_deleted', false)
            .gte('due_date', sevenDaysAgo.toISOString())
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error fetching schedule:', error);
        }

        if (data) {
            setScheduleItems((data as any[]).filter(item => item.source_type === 'manual' || !item.source_type));
        }
        setLoading(false);
    }, [caseId]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const handleAdd = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        if (!date || !content) return;

        setIsSubmitting(true);

        const dateTimeStr = time ? `${date}T${time}:00` : `${date}T00:00:00`;

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
            source_type: 'manual',
            priority: 'urgent-important',
            is_completed: false,
            user_id: user.id,
            type: time ? 'appointment' : 'personal',
        };

        const { data, error } = await supabase.from('todos').insert([newItem]).select('id').single();

        if (error) {
            alert('新增失敗: ' + error.message);
        } else {
            if (data?.id) {
                try {
                    await syncTodoToCalendar(data.id);
                } catch (syncErr) {
                    console.error('[CaseSchedule] 行事曆同步失敗（不中斷）:', syncErr);
                }
            }
            setContent('');
            setDate('');
            setTime('');
            fetchSchedule();
            router.refresh();
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        setScheduleItems((prev) => prev.filter((item) => item.id !== id));

        const { error } = await supabase.from('todos').update({ is_deleted: true }).eq('id', id);

        if (error) {
            console.error('Soft delete error:', error);
            const { error: hardError } = await supabase.from('todos').delete().eq('id', id);

            if (hardError) {
                console.error('Delete failed:', hardError);
                alert('刪除失敗，請檢查網路連線');
                fetchSchedule();
            } else {
                try {
                    await syncTodoToCalendar(id);
                } catch (syncErr) {
                    console.error('[CaseSchedule] 行事曆同步失敗（不中斷）:', syncErr);
                }
                router.refresh();
            }
        } else {
            try {
                await syncTodoToCalendar(id);
            } catch (syncErr) {
                console.error('[CaseSchedule] 行事曆同步失敗（不中斷）:', syncErr);
            }
            router.refresh();
        }
    };

    const startEdit = (item: ScheduleItem) => {
        setEditingId(item.id);
        const d = new Date(item.due_date);

        // Handle timezone properly or just take ISO string parts if stored as UTC but meant to be local...
        // Assuming naive usage for now as per original code:
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
            try {
                await syncTodoToCalendar(id);
            } catch (syncErr) {
                console.error('[CaseSchedule] 行事曆同步失敗（不中斷）:', syncErr);
            }
            setEditingId(null);
            fetchSchedule();
            router.refresh();
        }
    };

    const getFilteredItems = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return scheduleItems.filter(item => {
            const dueDate = new Date(item.due_date);
            const itemDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            switch (filter) {
                case 'future':
                    return itemDate >= today;
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

    return {
        scheduleItems,
        filteredItems: getFilteredItems(),
        loading,
        filter,
        setFilter,

        // Input form
        date, setDate,
        time, setTime,
        content, setContent,
        isSubmitting,
        handleAdd,

        // Edit
        editingId,
        editDate, setEditDate,
        editTime, setEditTime,
        editContent, setEditContent,
        startEdit,
        cancelEdit,
        saveEdit,
        handleDelete
    };
}
