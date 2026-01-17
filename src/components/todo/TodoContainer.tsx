'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TodoTask, TaskType, Priority } from './types';
import { TodoListView } from './TodoListView';
import { TodoMatrixView } from './TodoMatrixView';
import { TodoCalendarView } from './TodoCalendarView';
import { TodoWeekView } from './TodoWeekView';
import { List, LayoutGrid, Calendar, Plus, Trash2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

// Mock Data Generator
const generateMockTasks = (): TodoTask[] => [
    {
        id: '1',
        title: '林小美案 - 簽約確認',
        type: 'legal',
        date: new Date(new Date().setHours(10, 0, 0, 0)),
        isCompleted: false,
        priority: 'urgent-important',
        caseName: '林小美案',
        caseId: 'case-001',
    },
    {
        id: '2',
        title: '陳大文案 - 土增稅繳納期限',
        type: 'tax',
        date: new Date(new Date().setDate(new Date().getDate() + 2)), // 2 days later
        isCompleted: false,
        priority: 'urgent-important',
        caseName: '陳大文案',
        caseId: 'case-002',
    },
    {
        id: '3',
        title: '張經理 - 用印預約',
        type: 'appointment',
        date: new Date(new Date().setHours(14, 30, 0, 0)),
        isCompleted: false,
        priority: 'not-urgent-important',
        notes: '記得帶印鑑證明',
    },
    {
        id: '4',
        title: '去銀行補摺',
        type: 'personal',
        date: new Date(new Date().setDate(new Date().getDate() + 1)),
        isCompleted: true,
        priority: 'not-urgent-not-important',
    },
    {
        id: '5',
        title: '王小明案 - 完稅通知',
        type: 'legal',
        date: new Date(new Date().setDate(new Date().getDate() + 5)),
        isCompleted: false,
        priority: 'not-urgent-important',
        caseName: '王小明案',
    },
    {
        id: '6',
        title: '整理辦公室文件',
        type: 'personal',
        date: new Date(new Date().setDate(new Date().getDate() + 3)),
        isCompleted: false,
        priority: 'not-urgent-not-important',
    },
];

const TodoContainer = () => {
    const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'calendar' | 'week'>('list');
    const [tasks, setTasks] = useState<TodoTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newTodoContent, setNewTodoContent] = useState('');
    const [newTodoDate, setNewTodoDate] = useState(new Date().toISOString().slice(0, 10)); // Default to today YYYY-MM-DD

    const fetchAndSyncTodos = async () => {
        try {
            setLoading(true);
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // 1. Fetch Existing Todos
            const { data: existingTodos, error: todoError } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id);

            if (todoError) throw todoError;

            // --- Deduplication Logic START ---
            // Fix for "Double Reminder" bug: Remove duplicate system tasks if they exist in DB
            const uniqueMap = new Map<string, string>();
            const duplicatesToDelete: string[] = [];
            let cleanExistingTodos = existingTodos || [];

            (existingTodos || []).forEach((t: any) => {
                if (t.source_type === 'system') {
                    // 1. Delete legacy system tasks (no key) or corrupted key
                    if (!t.source_key) {
                        console.warn(`Legacy/Invalid system task found (no key), marking ${t.id} for deletion.`);
                        duplicatesToDelete.push(t.id);
                        return;
                    }

                    // 2. Delete duplicates (same key)
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
            // --- Deduplication Logic END ---

            // 2. Fetch Active Cases
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
                .eq('user_id', user.id) // Filter by user to respect isolation
                .neq('status', 'Closed'); // Only active cases

            if (caseError) throw caseError;

            const todosToInsert: any[] = [];
            const todosToUpdate: any[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

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

                // Check existence
                const exists = cleanExistingTodos.find((t: any) => t.case_id === c.id && t.source_key === key);

                // Logic for urgency
                // remindDate is already calculated above (lines 125-126)
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
                    // Check if update needed (Different date or title mismatch)
                    const oldDate = new Date(exists.due_date).getTime();
                    const newDateVal = new Date(dateStr).getTime();

                    // For appointments, we care about time changes too, so use getTime()
                    // allow small drift (1 min) to avoid loops if parsing differs slightly
                    if (Math.abs(oldDate - newDateVal) > 60000) {
                        console.log(`Updating task for ${key}: ${exists.due_date} -> ${dateStr}`);
                        todosToUpdate.push({
                            id: exists.id, // ID is required for update
                            user_id: user.id,
                            content: newTitle,
                            priority: isUrgent ? 'urgent-important' : 'not-urgent-important',
                            due_date: dateStr,
                            case_id: c.id,
                            source_type: 'system',
                            source_key: key,
                            is_completed: false, // Reset completion on date change
                            created_at: exists.created_at,
                        });
                    }
                } else {
                    // Insert New
                    todosToInsert.push({
                        user_id: user.id,
                        content: newTitle, // Will now include precise time for appointments
                        priority: isUrgent ? 'urgent-important' : 'not-urgent-important',
                        due_date: dateStr,
                        case_id: c.id,
                        source_type: 'system',
                        source_key: key,
                        is_completed: false,
                    });
                }
            };

            activeCases?.forEach((c: any) => {
                const m = c.milestones?.[0] || {};
                const f = c.financials?.[0] || {};

                // Legal Dates (3 days before)
                addSystemTask(c, 'contract_date', m.contract_date, 3, 'legal', '簽約日');
                addSystemTask(c, 'sign_diff_date', m.sign_diff_date, 3, 'legal', '補差額'); // Added as requested in new form
                addSystemTask(c, 'seal_date', m.seal_date, 3, 'legal', '用印日');
                addSystemTask(c, 'tax_payment_date', m.tax_payment_date, 3, 'legal', '完稅日');
                addSystemTask(c, 'transfer_date', m.transfer_date, 3, 'legal', '過戶日'); // Added
                addSystemTask(c, 'redemption_date', m.redemption_date, 3, 'legal', '代償日'); // Added
                addSystemTask(c, 'handover_date', m.handover_date, 3, 'legal', '交屋日');

                // Appointments (3 days before)
                addSystemTask(c, 'seal_appt', m.seal_appointment, 3, 'appointment', '用印約定');
                addSystemTask(c, 'tax_appt', m.tax_appointment, 3, 'appointment', '完稅約定');
                addSystemTask(c, 'handover_appt', m.handover_appointment, 3, 'appointment', '交屋約定');

                // Tax Deadlines (5 days before)
                addSystemTask(c, 'land_val_tax', f.land_value_tax_deadline, 5, 'tax', '土增稅限繳');
                addSystemTask(c, 'deed_tax', f.deed_tax_deadline, 5, 'tax', '契稅限繳');
                addSystemTask(c, 'land_tax', f.land_tax_deadline, 5, 'tax', '地價稅限繳');
                addSystemTask(c, 'house_tax', f.house_tax_deadline, 5, 'tax', '房屋稅限繳');
            });

            // Perform Updates
            if (todosToUpdate.length > 0) {
                console.log('Updating todos:', todosToUpdate);
                const { error } = await supabase.from('todos').upsert(todosToUpdate);
                if (error) console.error('Update Error:', JSON.stringify(error, null, 2));
            }

            // Perform Inserts
            if (todosToInsert.length > 0) {
                console.log('Inserting todos:', todosToInsert);
                const { error } = await supabase.from('todos').insert(todosToInsert);
                if (error) console.error('Insert Error:', JSON.stringify(error, null, 2));
            }

            // Refresh if any changes made, or just mapping existing
            if (todosToUpdate.length > 0 || todosToInsert.length > 0) {
                const { data: refreshedTodos } = await supabase.from('todos').select('*').eq('user_id', user.id);
                mapTodosToState(existingTodos || [], activeCases || []);
            } else {
                mapTodosToState(cleanExistingTodos, activeCases || []);
            }
        } catch (err) {
            console.error('Todo Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const mapTodosToState = (todos: any[], cases: any[]) => {
        const todayStr = new Date().toISOString().split('T')[0];

        const mapped: TodoTask[] = todos
            .filter((t) => !t.is_deleted) // Filter out soft-deleted items
            .filter((t) => {
                // Logic: Show all incomplete tasks.
                // For completed tasks: Only show if due date is Today or Future.
                // This achieves "Disappear next day" effect (Past completed tasks are hidden).
                // Note: If you complete an overdue task, it vanishes immediately.
                if (!t.is_completed) return true;

                const d = new Date(t.due_date || t.created_at);
                const tDate = d.toISOString().split('T')[0];
                return tDate >= todayStr;
            })
            .map((t) => {
                // Determine type based on source or content content heuristics if manual
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
    };

    useEffect(() => {
        fetchAndSyncTodos();
    }, []);

    const toggleTask = async (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const newVal = !task.isCompleted;

        console.log('Toggling task:', id, 'to', newVal);

        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: newVal } : t)));

        const { error } = await supabase.from('todos').update({ is_completed: newVal }).eq('id', id);
        if (error) console.error('Toggle Error:', error);
    };

    const deleteTodo = async (id: string) => {
        console.log('Deleting task:', id);

        // Optimistic UI
        setTasks((prev) => prev.filter((t) => t.id !== id));

        // 1. Try Soft Delete (Preferred)
        const { error: softError } = await supabase.from('todos').update({ is_deleted: true }).eq('id', id);

        if (softError) {
            console.warn('Soft delete failed (likely schema mismatch), attempting hard delete...', softError);

            // 2. Fallback to Hard Delete (Legacy compatibility)
            const { error: hardError } = await supabase.from('todos').delete().eq('id', id);

            if (hardError) {
                console.error('All delete attempts failed:', hardError);
                // Revert optimistic update only on total failure
                fetchAndSyncTodos();
                alert('刪除失敗 (請檢查網路或資料庫權限)');
            } else {
                console.log('Item permanently deleted (Hard Delete applied)');
            }
        }
    };

    const addManualTodo = async () => {
        if (!newTodoContent.trim()) return;
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        // Use selected date or today
        const targetDate = new Date(newTodoDate);
        targetDate.setHours(9, 0, 0, 0); // Default to 9 AM

        const newTodo = {
            user_id: user.id,
            content: newTodoContent,
            is_completed: false,
            priority: 'not-urgent-important', // Default
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

            // Re-fetch to ensure proper sorting/data integrity
            fetchAndSyncTodos();

            setNewTodoContent('');
            setShowAdd(false);
        } else {
            console.error('Add Todo Error:', error);
            alert('新增失敗: ' + error?.message);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        ✅ 智慧代辦中心
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
                                    type="date"
                                    value={newTodoDate}
                                    onChange={(e) => setNewTodoDate(e.target.value)}
                                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-32"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAdd(false)} className="text-slate-500 px-3 py-1.5 text-xs">
                                取消
                            </button>
                            <button
                                onClick={addManualTodo}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                            >
                                新增事項
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setNewTodoDate(new Date().toISOString().slice(0, 10)); // Reset to today
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
