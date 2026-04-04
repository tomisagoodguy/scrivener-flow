import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays } from 'date-fns';
import { TodoTask, TaskType, Priority } from '@/components/todo/types';

interface RawMilestone {
    contract_date: string | null;
    seal_date: string | null;
    tax_payment_date: string | null;
    handover_date: string | null;
    sign_appointment: string | null;
    seal_appointment: string | null;
    tax_appointment: string | null;
    handover_appointment: string | null;
}

interface RawCase {
    id: string;
    case_number: string;
    buyer_name: string;
    status: string;
    milestones: RawMilestone[];
    financials: unknown[];
}

interface RawTodo {
    id: string;
    content: string;
    due_date: string;
    is_completed: boolean;
    source_type: string | null;
    source_key: string | null;
    priority: string;
    case_id: string | null;
    notes: string | null;
}

/**
 * useWorkDashboard Hook
 * 處理所有工作儀表板的資料抓取、過濾與狀態管理
 */
export function useWorkDashboard() {
    const supabase = useMemo(() => createClient(), []);
    const [tasks, setTasks] = useState<TodoTask[]>([]);
    const [loading, setLoading] = useState(true);

    /**
     * 抓取活躍案件與待辦事項
     */
    const fetchTasks = useCallback(async () => {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // 抓取活躍案件與關聯資料
            const { data: cases, error } = await supabase
                .from('cases')
                .select(`
                    id, case_number, buyer_name, status,
                    milestones (
                        contract_date, seal_date, tax_payment_date, handover_date,
                        sign_appointment, seal_appointment, tax_appointment, handover_appointment
                    ),
                    financials (
                        land_value_tax_deadline, deed_tax_deadline, land_tax_deadline, house_tax_deadline
                    )
                `)
                .eq('user_id', user.id)
                .neq('status', 'Closed')
                .neq('status', 'Cancelled');

            if (error) throw error;

            // 抓取已同步的待辦事項（由 TodoContainer 管理）
            const { data: syncedTodos } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_completed', false)
                .order('due_date', { ascending: true });

            if (syncedTodos) {
                const activeCaseIds = new Set(cases?.map(c => c.id) || []);
                const caseMap: Record<string, string> = {};
                (cases as RawCase[] ?? []).forEach((c) => {
                    caseMap[c.id] = c.buyer_name;
                });

                // 將 Todos 轉換為 TodoTask 格式
                const todoTasks: TodoTask[] = (syncedTodos as RawTodo[])
                    .filter((t) => {
                        if (t.source_key === 'contract_date' || t.content.includes('簽約日')) return false;
                        if (t.case_id && !activeCaseIds.has(t.case_id)) return false;
                        return true;
                    })
                    .map((t) => {
                        let type: TaskType = 'personal';
                        if (t.source_type === 'system') {
                            if (t.source_key?.includes('tax') || t.source_key === 'shortfall_payment_alert') type = 'tax';
                            else if (t.source_key?.includes('appt')) type = 'appointment';
                            else type = 'legal';
                        }
                        return {
                            id: t.id,
                            title: t.content,
                            type,
                            date: new Date(t.due_date),
                            isCompleted: t.is_completed,
                            isMilestone: false,
                            priority: t.priority as Priority,
                            caseId: t.case_id ?? undefined,
                            caseName: t.case_id ? (caseMap[t.case_id] || undefined) : undefined,
                            notes: t.notes ?? undefined
                        };
                    });

                // 新增 Milestone 標記（資訊性質，不可勾選）
                const milestoneMarkers: TodoTask[] = [];
                (cases as RawCase[] ?? []).forEach((c) => {
                    const m = c.milestones?.[0] || {};
                    const addMarker = (dateStr: string | null, label: string) => {
                        if (!dateStr) return;
                        milestoneMarkers.push({
                            id: `m-${c.id}-${label}`,
                            title: `${c.buyer_name} - ${label}`,
                            type: 'legal',
                            date: new Date(dateStr),
                            isCompleted: false,
                            isMilestone: true,
                            priority: 'not-urgent-important',
                            caseId: c.id,
                            caseName: c.buyer_name
                        });
                    };
                    addMarker(m.seal_date, '用印日');
                    addMarker(m.tax_payment_date, '完稅日');
                    addMarker(m.handover_date, '交屋日');
                });

                setTasks([...todoTasks, ...milestoneMarkers]);
            }

        } catch (err) {
            console.error('Dashboard Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * 初始化與即時訂閱
     */
    useEffect(() => {
        fetchTasks();
        const channel = supabase.channel('dashboard_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, fetchTasks)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, fetchTasks)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'financials' }, fetchTasks)
            .subscribe();

        // 監聽跨元件同步事件
        const handleSync = () => fetchTasks();
        window.addEventListener('todo-updated', handleSync);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('todo-updated', handleSync);
        };
    }, [fetchTasks]);

    /**
     * 完成任務
     */
    const completeTask = async (taskId: string) => {
        try {
            const { error } = await supabase
                .from('todos')
                .update({ is_completed: true })
                .eq('id', taskId);
            if (error) throw error;
            setTasks(prev => prev.filter(t => t.id !== taskId));

            // 觸發跨元件同步
            window.dispatchEvent(new CustomEvent('todo-updated'));
        } catch (err) {
            console.error('Failed to complete task:', err);
        }
    };

    /**
     * 封存所有逾期超過 5 天的任務（標記為已完成）
     */
    const archiveStaleTasks = useCallback(async () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const staleIds = tasks
            .filter(t => !t.isMilestone && differenceInDays(t.date, now) < 0)
            .map(t => t.id);
        if (staleIds.length === 0) return;
        await supabase.from('todos').update({ is_completed: true }).in('id', staleIds);
        setTasks(prev => prev.filter(t => !staleIds.includes(t.id)));
        window.dispatchEvent(new CustomEvent('todo-updated'));
    }, [tasks]);

    /**
     * 計算過濾後的任務類別
     */
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 只顯示未來 3 天內的任務（不含過期）
    const urgentTasks = tasks.filter(t => {
        if (t.isMilestone) return false;
        const diff = differenceInDays(t.date, today);
        return diff >= 0 && diff <= 3;
    });
    // 所有過期任務（可透過封存按鈕一鍵清除）
    const staleTasks = tasks.filter(t => !t.isMilestone && differenceInDays(t.date, today) < 0);
    const taxTasks = tasks.filter(t => t.type === 'tax');
    const pipelineTasks = tasks.filter(t => {
        const diff = differenceInDays(t.date, today);
        return diff >= 0 && diff <= 7;
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
        tasks,
        loading,
        urgentTasks,
        staleTasks,
        taxTasks,
        pipelineTasks,
        completeTask,
        archiveStaleTasks
    };
}