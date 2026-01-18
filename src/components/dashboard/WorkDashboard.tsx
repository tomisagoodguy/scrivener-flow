'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, differenceInDays, parseISO, addDays, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    ArrowRight,
    Briefcase,
    FileText,
    TrendingUp,
    MoreHorizontal
} from 'lucide-react';
import { TodoTask } from '../todo/types';

interface WorkDashboardProps {
    className?: string;
}

export const WorkDashboard: React.FC<WorkDashboardProps> = ({ className }) => {
    const [tasks, setTasks] = useState<TodoTask[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Fetch active cases and their milestones/financials
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

            // Since we didn't implement full sync here (would duplicate TodoContainer), 
            // we will fetch the ALREADY SYNCED tasks from 'todos' table which TodoContainer populates!

            const { data: syncedTodos } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_completed', false) // Only show active
                .order('due_date', { ascending: true });

            if (syncedTodos) {
                // Create a case lookup map and active set
                const activeCaseIds = new Set(cases?.map(c => c.id) || []);
                const caseMap: Record<string, string> = {};
                cases?.forEach((c: any) => {
                    caseMap[c.id] = c.buyer_name;
                });

                // 3. Map actual todos (These will have completion checkboxes)
                const todoTasks: TodoTask[] = syncedTodos
                    .filter((t: any) => {
                        // Exclude redundant entries
                        if (t.source_key === 'contract_date' || t.content.includes('簽約日')) return false;
                        // Filter by Case Status: Only show if it's personal or belongs to an active case
                        if (t.case_id && !activeCaseIds.has(t.case_id)) return false;
                        return true;
                    })
                    .map((t: any) => {
                        let type: any = 'personal';
                        if (t.source_type === 'system') {
                            if (t.source_key?.includes('tax')) type = 'tax';
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
                            priority: t.priority as any,
                            caseId: t.case_id,
                            caseName: t.case_id ? (caseMap[t.case_id] || undefined) : undefined,
                            notes: t.notes || undefined
                        };
                    });

                // 4. Map Milestones directly from Cases (Informational Markers)
                const milestoneMarkers: TodoTask[] = [];
                cases?.forEach((c: any) => {
                    const m = c.milestones?.[0] || {};
                    const addMarker = (dateStr: string, label: string) => {
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
    };

    useEffect(() => {
        fetchTasks();
        const channel = supabase.channel('dashboard_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, fetchTasks)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const urgentTasks = tasks.filter(t => !t.isMilestone && differenceInDays(t.date, today) <= 3);
    const taxTasks = tasks.filter(t => t.type === 'tax');
    // Pipeline shows everything within 7 days including today
    const pipelineTasks = tasks.filter(t => {
        const diff = differenceInDays(t.date, today);
        return diff >= 0 && diff <= 7;
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (loading) {
        return (
            <div className={`grid grid-cols-1 xl:grid-cols-12 gap-6 ${className}`}>
                <div className="xl:col-span-7 space-y-6">
                    <div className="glass-card p-6 h-[400px] skeleton rounded-[32px]" />
                    <div className="glass-card p-6 h-[200px] skeleton rounded-[32px]" />
                </div>
                <div className="xl:col-span-5 glass-card p-6 h-[600px] skeleton rounded-[32px]" />
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 xl:grid-cols-12 gap-8 ${className} animate-fade-in`}>
            {/* LEFT COLUMN: Risk Radar (Urgent & Tax) */}
            <div className="xl:col-span-7 space-y-8">

                {/* 1. URGENT ALERTS (Red Zone) */}
                <div className="glass-card p-8 border-red-100/50 relative overflow-hidden group">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] group-hover:bg-red-500/10 transition-colors" />

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-500 rounded-2xl shadow-sm border border-red-100/50">
                                <AlertTriangle className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                    緊急戰情室
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                                    Action Required within 72h
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-5xl font-black text-red-500/10 tabular-nums leading-none">
                                {String(urgentTasks.length).padStart(2, '0')}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                        {urgentTasks.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[24px] text-slate-400 font-bold flex flex-col items-center gap-3">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400/50" />
                                <span>目前無緊急事項，一切都在掌控中</span>
                            </div>
                        ) : (
                            urgentTasks.map(task => {
                                const diff = differenceInDays(task.date, today);
                                const isOverdue = diff < 0;
                                return (
                                    <div key={task.id} className="flex items-center gap-5 p-5 bg-white rounded-[20px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-200/50 transition-all duration-300 group/item">
                                        {/* Status Indicator */}
                                        <div className={`w-1.5 h-12 rounded-full transition-all duration-500 group-hover/item:h-14 ${isOverdue ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-orange-400'}`}></div>

                                        {/* Task Content */}
                                        <div className="flex-1 cursor-pointer" onClick={() => (window.location.href = `/cases/edit/${task.caseId}`)}>
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{task.title}</h3>
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm
                                                    ${isOverdue ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-100 text-orange-600'}
                                                `}>
                                                    {isOverdue ? `延遲 ${Math.abs(diff)} 天` : `倒數 ${diff} 天`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold">
                                                    <Calendar className="w-4 h-4 text-slate-300" />
                                                    {format(task.date, 'yyyy/MM/dd (EEE)', { locale: zhTW })}
                                                </span>
                                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {task.caseName}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Completion Action */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    const { error } = await supabase
                                                        .from('todos')
                                                        .update({ is_completed: true })
                                                        .eq('id', task.id);
                                                    if (error) throw error;
                                                    // Local state update for immediate feedback
                                                    setTasks(prev => prev.filter(t => t.id !== task.id));
                                                } catch (err) {
                                                    console.error('Failed to complete task:', err);
                                                }
                                            }}
                                            className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 text-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all duration-300 group/btn"
                                            title="標記為已完成"
                                        >
                                            <CheckCircle2 className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                                        </button>

                                        <ArrowRight className="w-5 h-5 text-slate-100 group-hover/item:text-red-400 group-hover/item:translate-x-1 transition-all" />
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* 2. TAX WATCH (Refined Slate Theme) */}
                <div className="glass-card p-8 border-slate-200/50 relative overflow-hidden group">
                    {/* Background Subtle Gradient */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] group-hover:bg-slate-500/10 transition-colors" />

                    <div className="relative z-10 flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shadow-sm border border-slate-200/50">
                                <FileText className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                    稅務監控中心
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                                    Tax Deadline Monitoring
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-black text-emerald-700 uppercase">監管中: {taxTasks.length}</span>
                        </div>
                    </div>

                    <div className="space-y-3 relative z-10 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                        {taxTasks.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[24px] text-slate-400 font-bold flex flex-col items-center gap-3">
                                <CheckCircle2 className="w-10 h-10 text-slate-200" />
                                <span>目前無待處理稅單</span>
                            </div>
                        ) : (
                            taxTasks.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => (window.location.href = `/cases/edit/${t.caseId}`)}
                                    className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg hover:border-slate-200 transition-all duration-300 cursor-pointer group/tax"
                                >
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 group-hover/tax:scale-110 transition-transform">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <div className="font-bold text-slate-800 truncate">{t.title.split('-')[0]}</div>
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md uppercase">
                                                {format(t.date, 'MM/dd')}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium truncate">
                                            {t.title.split('-')[1] || '稅務事項'}
                                        </div>
                                    </div>

                                    {/* Completion Action */}
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const { error } = await supabase
                                                    .from('todos')
                                                    .update({ is_completed: true })
                                                    .eq('id', t.id);
                                                if (error) throw error;
                                                // Local state update for immediate feedback
                                                setTasks(prev => prev.filter(item => item.id !== t.id));
                                            } catch (err) {
                                                console.error('Failed to complete tax task:', err);
                                            }
                                        }}
                                        className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 text-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all duration-300 group/btn"
                                        title="標記為已完成"
                                    >
                                        <CheckCircle2 className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN: 7-Day Pipeline */}
            <div className="xl:col-span-5 glass-card p-8 flex flex-col relative overflow-hidden group">
                {/* Background Decoration */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-50/30 to-transparent pointer-events-none" />

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100/50">
                            <TrendingUp className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                未來 7 日預告
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                                Upcoming Workflow Pipeline
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative z-10 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Visual Timeline Line */}
                    <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100" />

                    <div className="space-y-8 relative">
                        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                            const date = addDays(today, offset);
                            const dayTasks = pipelineTasks.filter(t => isSameDay(t.date, date));
                            const isToday = offset === 0;

                            return (
                                <div key={offset} className="flex gap-6 relative group/day">
                                    <div className={`
                                        w-12 h-14 rounded-2xl flex flex-col items-center justify-center z-10 transition-all duration-500
                                        ${isToday
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                                            : 'bg-white border border-slate-100 text-slate-400 group-hover/day:border-blue-200'}
                                    `}>
                                        <div className={`text-[10px] font-black uppercase ${isToday ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {format(date, 'EEE', { locale: zhTW })}
                                        </div>
                                        <div className="text-xl font-black leading-none">
                                            {format(date, 'dd')}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        {dayTasks.length > 0 ? (
                                            dayTasks.map(t => (
                                                <div key={t.id} className="p-4 rounded-[20px] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 cursor-pointer">
                                                    <div className="font-bold text-slate-800 tracking-tight">{t.title}</div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.caseName || '個人事項'}</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest
                                                            ${t.type === 'legal' ? 'bg-amber-100 text-amber-600' :
                                                                t.type === 'tax' ? 'bg-indigo-100 text-indigo-600' :
                                                                    'bg-slate-200 text-slate-600'}
                                                        `}>
                                                            {t.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-14 flex items-center text-xs text-slate-300 font-medium italic pl-4">
                                                無安排事項
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
