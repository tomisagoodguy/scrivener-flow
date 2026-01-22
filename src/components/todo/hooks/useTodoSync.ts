import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TodoTask, TaskType } from '../types';

/**
 * useTodoSync Hook
 * 處理所有與 Supabase 的同步、去重、系統任務生成邏輯
 */
export function useTodoSync() {
    const [tasks, setTasks] = useState<TodoTask[]>([]);
    const [loading, setLoading] = useState(true);

    /**
     * 將 Supabase todos 資料轉換為 UI 需要的 TodoTask 格式
     */
    const mapTodosToState = useCallback((todos: any[], cases: any[], activeCaseIds: Set<string>) => {
        const mapped: TodoTask[] = todos
            .filter((t) => !t.is_deleted)
            .filter((t) => {
                if (t.case_id && !activeCaseIds.has(t.case_id)) return false;
                return true;
            })
            // 過濾掉簽約相關的遺留任務
            .filter((t) => {
                if (t.source_key === 'contract_date') return false;
                if (t.source_key === 'sign_appt') return false;
                if (t.content?.includes('簽約日')) return false;
                if (t.content?.includes('簽約約定')) return false;
                return true;
            })
            .filter((t) => {
                if (!t.is_completed) return true;
                const d = new Date(t.due_date || t.created_at);
                const tDate = d.toISOString().split('T')[0];
                const nowStr = new Date().toISOString().split('T')[0];
                return tDate >= nowStr;
            })
            .map((t) => {
                let type: TaskType = 'personal';
                if (t.source_type === 'system') {
                    if (t.source_key?.includes('tax')) type = 'tax';
                    else if (t.source_key?.includes('appt')) type = 'appointment';
                    else if (t.source_key?.includes('date')) type = 'legal';
                }

                const relatedCase = cases.find((c) => c.id === t.case_id);

                return {
                    id: t.id,
                    title: t.content,
                    type: type,
                    date: new Date(t.due_date || t.created_at),
                    isCompleted: t.is_completed,
                    priority: t.priority || 'not-urgent-important',
                    caseName: relatedCase ? relatedCase.buyer_name : undefined,
                    caseId: t.case_id,
                    notes: t.source_type === 'system' ? '系統自動提醒' : undefined,
                };
            });

        setTasks(mapped);
    }, []);

    /**
     * 主要同步邏輯：抓取案件資料 → 生成/更新系統任務 → 去重 → 更新 State
     */
    const fetchAndSyncTodos = useCallback(async () => {
        try {
            setLoading(true);
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // 1. 抓取現有 Todos
            const { data: existingTodos, error: todoError } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id);

            if (todoError) throw todoError;

            // === 去重邏輯 START ===
            const uniqueMap = new Map<string, string>();
            const duplicatesToDelete: string[] = [];
            let cleanExistingTodos = existingTodos || [];

            (existingTodos || []).forEach((t: any) => {
                if (t.source_type === 'system') {
                    if (!t.source_key) {
                        console.warn(`Legacy/Invalid system task found (no key), marking ${t.id} for deletion.`);
                        duplicatesToDelete.push(t.id);
                        return;
                    }

                    if (t.case_id) {
                        const key = `${t.case_id}_${t.source_key}`;
                        if (uniqueMap.has(key)) {
                            console.warn(`Duplicate found for ${key}, marking ${t.id} for deletion.`);
                            duplicatesToDelete.push(t.id);
                        } else {
                            uniqueMap.set(key, t.id);
                        }
                    }
                }
            });

            if (duplicatesToDelete.length > 0) {
                console.log(`Cleaning up ${duplicatesToDelete.length} duplicates...`);
                await supabase.from('todos').delete().in('id', duplicatesToDelete);
                cleanExistingTodos = cleanExistingTodos.filter((t: any) => !duplicatesToDelete.includes(t.id));
            }
            // === 去重邏輯 END ===

            // 2. 抓取活躍案件資料
            const { data: activeCases, error: caseError } = await supabase
                .from('cases')
                .select(
                    `
                        id, case_number, buyer_name,
                        milestones(
                            contract_date, seal_date, tax_payment_date, handover_date,
                            sign_appointment, seal_appointment, tax_appointment, handover_appointment
                        ),
                        financials(
                            land_value_tax_deadline, deed_tax_deadline, land_tax_deadline, house_tax_deadline
                        )
                    `
                )
                .eq('user_id', user.id)
                .neq('status', 'Closed')
                .neq('status', 'Cancelled');

            if (caseError) throw caseError;

            const todosToInsert: any[] = [];
            const todosToUpdate: any[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // === 系統任務生成邏輯 ===
            const addSystemTask = (
                c: any,
                key: string,
                dateStr: string | null,
                daysBefore: number,
                type: TaskType,
                titlePrefix: string
            ) => {
                if (!dateStr) return;
                const date = new Date(dateStr);
                const remindDate = new Date(date);
                remindDate.setDate(date.getDate() - daysBefore);

                const exists = cleanExistingTodos.find((t: any) => t.case_id === c.id && t.source_key === key);
                const isUrgent = today >= remindDate;
                const isAppointment = type === 'appointment';

                const dateDisplay = isAppointment
                    ? new Date(dateStr).toLocaleString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });

                const newTitle = `${c.buyer_name} 案 - ${titlePrefix} (${dateDisplay})`;

                if (exists) {
                    const oldDate = new Date(exists.due_date).getTime();
                    const newDateVal = new Date(dateStr).getTime();

                    if (Math.abs(oldDate - newDateVal) > 60000) {
                        console.log(`Updating task for ${key}: ${exists.due_date} -> ${dateStr}`);
                        todosToUpdate.push({
                            id: exists.id,
                            user_id: user.id,
                            content: newTitle,
                            priority: isUrgent ? 'urgent-important' : 'not-urgent-important',
                            due_date: dateStr,
                            case_id: c.id,
                            source_type: 'system',
                            source_key: key,
                            is_completed: false,
                            created_at: exists.created_at,
                        });
                    }
                } else {
                    todosToInsert.push({
                        user_id: user.id,
                        content: newTitle,
                        priority: isUrgent ? 'urgent-important' : 'not-urgent-important',
                        due_date: dateStr,
                        case_id: c.id,
                        source_type: 'system',
                        source_key: key,
                        is_completed: false,
                    });
                }
            };

            // 為每個活躍案件生成系統任務
            activeCases?.forEach((c: any) => {
                const m = c.milestones?.[0] || {};
                const f = c.financials?.[0] || {};

                // 法律日期 (3天前提醒)
                addSystemTask(c, 'sign_diff_date', m.sign_diff_date, 3, 'legal', '補差額');
                addSystemTask(c, 'seal_date', m.seal_date, 3, 'legal', '用印日');
                addSystemTask(c, 'tax_payment_date', m.tax_payment_date, 3, 'legal', '完稅日');
                addSystemTask(c, 'transfer_date', m.transfer_date, 3, 'legal', '過戶日');
                addSystemTask(c, 'redemption_date', m.redemption_date, 3, 'legal', '代償日');
                addSystemTask(c, 'handover_date', m.handover_date, 3, 'legal', '交屋日');

                // 約定時間 (3天前提醒)
                addSystemTask(c, 'seal_appt', m.seal_appointment, 3, 'appointment', '用印約定');
                addSystemTask(c, 'tax_appt', m.tax_appointment, 3, 'appointment', '完稅約定');
                addSystemTask(c, 'handover_appt', m.handover_appointment, 3, 'appointment', '交屋約定');

                // 稅單限繳 (5天前提醒)
                addSystemTask(c, 'land_val_tax', f.land_value_tax_deadline, 5, 'tax', '土增稅限繳');
                addSystemTask(c, 'deed_tax', f.deed_tax_deadline, 5, 'tax', '契稅限繳');
                addSystemTask(c, 'land_tax', f.land_tax_deadline, 5, 'tax', '地價稅限繳');
                addSystemTask(c, 'house_tax', f.house_tax_deadline, 5, 'tax', '房屋稅限繳');
            });

            // 執行更新與插入
            if (todosToUpdate.length > 0) {
                console.log('Updating todos:', todosToUpdate);
                const { error } = await supabase.from('todos').upsert(todosToUpdate);
                if (error) console.error('Update Error:', JSON.stringify(error, null, 2));
            }

            if (todosToInsert.length > 0) {
                console.log('Inserting todos:', todosToInsert);
                const { error } = await supabase.from('todos').insert(todosToInsert);
                if (error) console.error('Insert Error:', JSON.stringify(error, null, 2));
            }

            // 更新 State
            const activeCaseIds = new Set(activeCases?.map(c => c.id) || []);
            mapTodosToState(cleanExistingTodos, activeCases || [], activeCaseIds);

        } catch (err) {
            console.error('Todo Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    }, [mapTodosToState]);

    /**
     * 初始化：載入資料 + 訂閱即時更新
     */
    useEffect(() => {
        fetchAndSyncTodos();

        const channel = supabase
            .channel('todos-main-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
                console.log('Todos changed elsewhere, refreshing...', payload.eventType);
                fetchAndSyncTodos();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAndSyncTodos]);

    /**
     * 切換任務完成狀態
     */
    const toggleTask = async (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const newVal = !task.isCompleted;

        console.log('Toggling task:', id, 'to', newVal);
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: newVal } : t)));

        const { error } = await supabase.from('todos').update({ is_completed: newVal }).eq('id', id);
        if (error) console.error('Toggle Error:', error);
    };

    /**
     * 刪除任務 (軟刪除優先，失敗則硬刪除)
     */
    const deleteTodo = async (id: string) => {
        console.log('Deleting task:', id);
        setTasks((prev) => prev.filter((t) => t.id !== id));

        const { error: softError } = await supabase.from('todos').update({ is_deleted: true }).eq('id', id);

        if (softError) {
            console.warn('Soft delete failed, attempting hard delete...', softError);
            const { error: hardError } = await supabase.from('todos').delete().eq('id', id);

            if (hardError) {
                console.error('All delete attempts failed:', hardError);
                fetchAndSyncTodos();
                alert('刪除失敗 (請檢查網路或資料庫權限)');
            } else {
                console.log('Item permanently deleted (Hard Delete applied)');
            }
        }
    };

    /**
     * 新增手動代辦事項
     */
    const addManualTodo = async (content: string, dueDate: string) => {
        if (!content.trim()) return;
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const targetDate = new Date(dueDate);

        const newTodo = {
            user_id: user.id,
            content: content,
            is_completed: false,
            priority: 'not-urgent-important',
            due_date: targetDate.toISOString(),
            source_type: 'manual',
        };

        const { data, error } = await supabase.from('todos').insert([newTodo]).select().single();
        if (data && !error) {
            setTasks((prev) => [
                {
                    id: data.id,
                    title: data.content,
                    date: new Date(data.due_date || data.created_at),
                    type: 'personal',
                    isCompleted: false,
                    priority: 'not-urgent-important',
                },
                ...prev,
            ]);

            fetchAndSyncTodos();
        } else {
            console.error('Add Todo Error:', error);
            alert('新增失敗: ' + error?.message);
        }
    };

    return {
        tasks,
        loading,
        toggleTask,
        deleteTodo,
        addManualTodo,
        refreshTodos: fetchAndSyncTodos
    };
}
