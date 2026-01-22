'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';
import { parseDocx } from '@/app/actions/parseDocx';
import CaseScheduleManager from '@/components/features/cases/CaseScheduleManager';
import QuickNotes from '@/components/shared/QuickNotes';
import CaseTodos from '@/components/features/cases/CaseTodos';
import CaseMessageGenerator from '@/components/features/cases/CaseMessageGenerator';


import { getCaseStage } from '@/lib/stageUtils';
import {
    CheckCircle2,
    ChevronRight,
    ChevronDown,
    Edit3,
    Flag,
    FileText,
    ClipboardCheck,
    Truck
} from 'lucide-react';

interface EditCaseFormProps {
    initialData: DemoCase;
}

export default function EditCaseForm({ initialData }: EditCaseFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState(initialData.notes || '');
    const [transferNote, setTransferNote] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

    // New: Private Notes
    const [privateNotes, setPrivateNotes] = useState(initialData.private_notes || '');

    // User permission for experimental features
    const [currentUserEmail, setCurrentUserEmail] = useState('');

    // --- Custom Attributes (inspired by Twenty) ---
    const [attributes, setAttributes] = useState<Record<string, string>>({});
    const [isAttributesExpanded, setIsAttributesExpanded] = useState(false);

    // Helper to parse/extract attributes from notes string
    const parseAttributes = (rawNotes: string) => {
        const match = rawNotes.match(/\[\[ATTR:(.*?)\]\]/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                return {};
            }
        }
        return {};
    };

    const stripAttributesFromNotes = (rawNotes: string) => {
        return rawNotes.replace(/\[\[ATTR:.*?\]\]/, '').trim();
    };

    useEffect(() => {
        if (initialData.notes) {
            setAttributes(parseAttributes(initialData.notes));
            setNotes(stripAttributesFromNotes(initialData.notes));
        }
    }, [initialData.notes]);

    // 替代 window.confirm 的二次確認狀態
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const milestones = (initialData.milestones?.[0] || {}) as any;
    const financials = (initialData.financials?.[0] || {}) as any;

    // Helper to format date for <input type="date"> (strips time and handles local time)
    const toISODate = (val: any) => {
        if (!val) return '';
        try {
            const date = new Date(val);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    };

    // Helper to format date for <input type="datetime-local">
    const toISODatetime = (val: any) => {
        if (!val) return '';
        try {
            const date = new Date(val);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const mins = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${mins}`;
        } catch {
            return '';
        }
    };

    useEffect(() => {
        console.log('EditCaseForm initialized with Case ID:', initialData.id);
        const m = (initialData.milestones?.[0] || {}) as any;
        setTransferNote(m.transfer_note || '');

        // Fetch current user
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.email) {
                setCurrentUserEmail(data.user.email);
            }
        });
    }, [initialData.id, initialData.milestones]);

    // --- Incremental Persistence (Auto-save) ---
    useEffect(() => {
        // Only auto-save if content actually changed
        const currentFullNotes = `${notes}\n\n[[ATTR:${JSON.stringify(attributes)}]]`.trim();
        const initialFullNotes = (initialData.notes || '').trim();

        if (currentFullNotes === initialFullNotes && privateNotes === (initialData.private_notes || '')) {
            return;
        }

        const timer = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const { error } = await supabase
                    .from('cases')
                    .update({
                        notes: currentFullNotes,
                        private_notes: privateNotes,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', initialData.id);

                if (error) throw error;
                setSaveStatus('saved');
                setLastSaved(new Date());
                setTimeout(() => setSaveStatus('idle'), 3000);
            } catch (err) {
                console.error('Auto-save failed:', err);
                setSaveStatus('error');
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [notes, privateNotes, attributes, initialData.id, initialData.notes]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrorMsg('');
        setDebugInfo('正在準備儲存...');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        const formatDate = (val: FormDataEntryValue) => (val ? val.toString() : null);

        try {
            setDebugInfo('正在更新案件主體 (cases)...');
            const { error: caseError } = await supabase
                .from('cases')
                .update({
                    case_number: data.case_number,
                    city: data.city,
                    district: data.district,
                    buyer_name: data.buyer,
                    seller_name: data.seller,
                    status: data.status,
                    notes: `${notes}\n\n[[ATTR:${JSON.stringify(attributes)}]]`.trim(),
                    private_notes: privateNotes,
                    pending_tasks: data.pending_tasks,
                    is_back_rent: data.is_back_rent === 'on',
                    tax_type: data.tax_type,
                    cancellation_type: data.cancellation_type,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', initialData.id);

            if (caseError) throw caseError;

            setDebugInfo('正在更新案件進度 (milestones)...');
            const milestoneData = {
                case_id: initialData.id,
                contract_date: formatDate(data.contract_date),
                contract_amount: data.contract_amount ? Number(data.contract_amount) : null,
                sign_diff_date: formatDate(data.sign_diff_date),
                sign_diff_amount: data.sign_diff_amount ? Number(data.sign_diff_amount) : null,
                seal_date: formatDate(data.seal_date),
                seal_amount: data.seal_amount ? Number(data.seal_amount) : null,
                tax_payment_date: formatDate(data.tax_payment_date),
                tax_amount: data.tax_amount ? Number(data.tax_amount) : null,
                transfer_date: formatDate(data.transfer_date),
                transfer_note: data.transfer_note?.toString() || null,
                balance_amount: data.balance_amount ? Number(data.balance_amount) : null,
                handover_date: formatDate(data.handover_date),
                redemption_date: formatDate(data.redemption_date),

                // Appointments
                sign_appointment: data.sign_appointment
                    ? new Date(data.sign_appointment as string).toISOString()
                    : null,
                seal_appointment: data.seal_appointment
                    ? new Date(data.seal_appointment as string).toISOString()
                    : null,
                tax_appointment: data.tax_appointment ? new Date(data.tax_appointment as string).toISOString() : null,
                handover_appointment: data.handover_appointment
                    ? new Date(data.handover_appointment as string).toISOString()
                    : null,
            };

            const { data: mCheck } = await supabase
                .from('milestones')
                .select('id')
                .eq('case_id', initialData.id)
                .maybeSingle();
            if (mCheck) {
                const { error: me } = await supabase.from('milestones').update(milestoneData).eq('id', mCheck.id);
                if (me) throw me;
            } else {
                const { error: me } = await supabase.from('milestones').insert([milestoneData]);
                if (me) throw me;
            }

            setDebugInfo('正在更新財務資訊 (financials)...');
            const financialData = {
                case_id: initialData.id,
                total_price: data.total_price ? Number(data.total_price) : null,
                pre_collected_fee: data.pre_collected_fee ? Number(data.pre_collected_fee) : null,
                buyer_bank: data.buyer_loan_bank?.toString() || null,
                seller_bank: data.seller_loan_bank?.toString() || null,

                // Tax Deadlines
                land_value_tax_deadline: formatDate(data.land_value_tax_deadline),
                deed_tax_deadline: formatDate(data.deed_tax_deadline),
                land_tax_deadline: formatDate(data.land_tax_deadline),
                house_tax_deadline: formatDate(data.house_tax_deadline),
            };

            const { data: fCheck } = await supabase
                .from('financials')
                .select('id')
                .eq('case_id', initialData.id)
                .maybeSingle();
            if (fCheck) {
                const { error: fe } = await supabase.from('financials').update(financialData).eq('id', fCheck.id);
                if (fe) throw fe;
            } else {
                const { error: fe } = await supabase.from('financials').insert([financialData]);
                if (fe) throw fe;
            }

            setDebugInfo('正在同步行事曆與備忘 (todos)...');
            // --- Sync System Todos ---
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const todosToUpsert: any[] = [];
                const caseTitle = data.buyer ? `${data.buyer} 案` : '案件';

                const addSystemTodo = (
                    key: string,
                    dateVal: string | null,
                    titleSuffix: string,
                    type: 'appointment' | 'tax' | 'legal',
                    daysBefore: number
                ) => {
                    if (!dateVal) return;
                    // Check if it's already an ISO string or just date
                    // Appointments are sent as ISO strings from earlier logic, Dates as YYYY-MM-DD
                    // We use the raw form data if possible, but formatted above as milestoneData/financialData

                    // Helper to check if string is ISO or Date
                    const isDateTime = dateVal.includes('T');
                    const d = new Date(dateVal);

                    // Formatted display
                    const dateDisplay = isDateTime
                        ? d.toLocaleString('zh-TW', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })
                        : d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });

                    const content = `${caseTitle} - ${titleSuffix} (${dateDisplay})`;

                    // Calculate urgency (optional logic, defaults to urgent if close)
                    // const remindDate = new Date(d);
                    // remindDate.setDate(d.getDate() - daysBefore);

                    todosToUpsert.push({
                        user_id: user.id,
                        case_id: initialData.id,
                        content: content,
                        due_date: dateVal, // Use the exact value stored in DB
                        priority: 'urgent-important', // Default system tasks to important
                        source_type: 'system',
                        source_key: key,
                        is_completed: false, // Reset completion if date changes? Maybe yes for simplicity
                        is_deleted: false,
                    });
                };

                // Appointments
                addSystemTodo('seal_appt', milestoneData.seal_appointment, '用印約定', 'appointment', 3);
                addSystemTodo('tax_appt', milestoneData.tax_appointment, '完稅約定', 'appointment', 3);
                addSystemTodo('handover_appt', milestoneData.handover_appointment, '交屋約定', 'appointment', 3);

                // Tax Deadlines
                addSystemTodo('land_val_tax', financialData.land_value_tax_deadline, '土增稅限繳', 'tax', 5);
                addSystemTodo('deed_tax', financialData.deed_tax_deadline, '契稅限繳', 'tax', 5);
                addSystemTodo('land_tax', financialData.land_tax_deadline, '地價稅限繳', 'tax', 5);
                addSystemTodo('house_tax', financialData.house_tax_deadline, '房屋稅限繳', 'tax', 5);

                if (todosToUpsert.length > 0) {
                    // 1. Fetch ALL pre-existing system todos for this case to handle duplicates
                    const { data: existingSystemTodos } = await supabase
                        .from('todos')
                        .select('id, source_key')
                        .eq('case_id', initialData.id)
                        .eq('source_type', 'system');

                    const keyMap = new Map();
                    const idsToCleanup: any[] = [];

                    (existingSystemTodos || []).forEach((t: any) => {
                        if (t.source_key) {
                            if (keyMap.has(t.source_key)) {
                                // Already have one for this key? Mark extras for deletion to fix the "Double Reminder" bug
                                idsToCleanup.push(t.id);
                            } else {
                                keyMap.set(t.source_key, t.id);
                            }
                        }
                    });

                    // 2. Perform cleanup of extras if found
                    if (idsToCleanup.length > 0) {
                        console.log(`Cleaning up ${idsToCleanup.length} pre-existing duplicate system todos...`);
                        await supabase.from('todos').delete().in('id', idsToCleanup);
                    }

                    // 3. Prepare final payload with correct IDs for upsert
                    const finalPayload = todosToUpsert.map((t) => {
                        const existingId = keyMap.get(t.source_key);
                        if (existingId) {
                            return { ...t, id: existingId };
                        }
                        return t;
                    });

                    if (finalPayload.length > 0) {
                        const { error: todoError } = await supabase.from('todos').upsert(finalPayload);
                        if (todoError) {
                            console.error('Todo Sync Error Detail:', {
                                message: todoError.message,
                                details: todoError.details,
                                hint: todoError.hint,
                                code: todoError.code,
                                payload: finalPayload
                            });
                        }
                    }
                }
            }

            setDebugInfo('儲存成功，正跳轉中...');
            router.push('/cases');
            router.refresh();
        } catch (error: any) {
            console.error('Submit Error:', error);
            setErrorMsg(`儲存失敗 (${error.code || 'UNKNOWN'}): ${error.message || JSON.stringify(error)}`);
            setLoading(false);
        }
    };


    const performDelete = async () => {
        console.log('performDelete absolute start');
        setLoading(true);
        setErrorMsg('');
        setDebugInfo('開始執行刪除流程...');

        try {
            setDebugInfo('步驟 1/3: 正在刪除關聯進度 (milestones)...');
            const { error: mError } = await supabase.from('milestones').delete().eq('case_id', initialData.id);
            if (mError) throw new Error(`無法刪除進度資料: ${mError.message}`);

            setDebugInfo('步驟 2/3: 正在刪除關聯財務 (financials)...');
            const { error: fError } = await supabase.from('financials').delete().eq('case_id', initialData.id);
            if (fError) throw new Error(`無法刪除財務資料: ${fError.message}`);

            setDebugInfo('步驟 3/3: 正在刪除案件主體 (cases)...');
            const { error: cError } = await supabase.from('cases').delete().eq('id', initialData.id);
            if (cError) throw new Error(`無法刪除案件主體: ${cError.message}`);

            setDebugInfo('刪除完成，正跳轉中...');
            router.push('/cases');
            router.refresh();
        } catch (error: any) {
            console.error('Delete caught error:', error);
            setErrorMsg(`刪除失敗: ${error.message}`);
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            setLoading(true);
            const parsedData = await parseDocx(formData);
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
                const setVal = (name: string, val?: any) => {
                    const el = form.elements.namedItem(name) as
                        | HTMLInputElement
                        | HTMLSelectElement
                        | HTMLTextAreaElement;
                    if (el && val !== undefined && val !== null) {
                        el.value = val.toString();
                        if (name === 'notes') setNotes(val.toString());
                    }
                };
                if (parsedData.case_number) setVal('case_number', parsedData.case_number);
                if (parsedData.buyer_name) setVal('buyer', parsedData.buyer_name);
                if (parsedData.seller_name) setVal('seller', parsedData.seller_name);
                if (parsedData.contract_date) setVal('contract_date', parsedData.contract_date);
                if (parsedData.total_price) setVal('total_price', parsedData.total_price);
                if (parsedData.seal_date) setVal('seal_date', parsedData.seal_date);
                if (parsedData.tax_payment_date) setVal('tax_payment_date', parsedData.tax_payment_date);
                if (parsedData.transfer_date) setVal('transfer_date', parsedData.transfer_date);
                if (parsedData.handover_date) setVal('handover_date', parsedData.handover_date);
                alert('✅ 資料讀取完成！');
            }
        } catch (err: any) {
            alert('解析失敗: ' + err.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-card glass-card p-8 rounded shadow-sm animate-slide-up space-y-8 border border-card-border"
        >
            {/* 錯誤與狀態提示區 */}
            {(errorMsg || loading) && (
                <div
                    className={`p-4 rounded-xl border-2 transition-all ${errorMsg ? 'bg-red-500/10 border-red-500 text-red-600 font-bold' : 'bg-primary/10 border-primary text-primary'}`}
                >
                    <div className="flex items-center gap-2">
                        {errorMsg ? '❌ ' : 'ℹ️ '}
                        <span>{errorMsg || debugInfo}</span>
                    </div>
                </div>
            )}

            {/* 案件全流程監控 (Pipeline Status) */}
            <div className="bg-secondary/30 border border-border-color rounded-2xl p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-foreground/60 flex items-center gap-2 tracking-widest uppercase">
                        <Flag className="w-4 h-4 text-primary" /> 案件流程進度 (Pipeline Status)
                    </h3>
                    <div className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 animate-pulse">
                        AUTO-TRACKING
                    </div>
                </div>

                <div className="flex items-center justify-between relative px-2">
                    {[
                        { id: 'contract', label: '簽約', icon: <Edit3 className="w-5 h-5" />, color: 'bg-blue-500' },
                        { id: 'seal', label: '用印', icon: <FileText className="w-5 h-5" />, color: 'bg-indigo-500' },
                        { id: 'tax', label: '完稅', icon: <ClipboardCheck className="w-5 h-5" />, color: 'bg-emerald-500' },
                        { id: 'transfer', label: '過戶', icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-purple-500' },
                        { id: 'handover', label: '交屋', icon: <Truck className="w-5 h-5" />, color: 'bg-red-500' },
                    ].map((stage, idx, stages) => {
                        const currentStage = getCaseStage(initialData);
                        const stageOrder = ['contract', 'seal', 'tax', 'transfer', 'handover', 'closed'];
                        const currentIdx = stageOrder.indexOf(currentStage);
                        const isCompleted = currentIdx > idx;
                        const isCurrent = currentIdx === idx;
                        const isLast = idx === stages.length - 1;

                        return (
                            <React.Fragment key={stage.id}>
                                <div className="flex flex-col items-center flex-shrink-0 z-10 transition-all duration-500">
                                    <div
                                        className={`
                                            relative w-12 h-12 rounded-full flex items-center justify-center text-white font-black shadow-lg border-4 transition-all duration-300
                                            ${isCompleted ? stage.color : isCurrent ? `${stage.color} ring-4 ring-primary/20 scale-110` : 'bg-secondary text-foreground/20 border-border-color'}
                                            ${isCurrent ? 'border-white' : 'border-transparent'}
                                        `}
                                    >
                                        {isCompleted ? <CheckCircle2 className="w-6 h-6 animate-fade-in" /> : stage.icon}

                                        {isCurrent && (
                                            <div className="absolute -top-1 -right-1 bg-primary w-4 h-4 rounded-full border-2 border-white animate-bounce" />
                                        )}
                                    </div>
                                    <div className="mt-2 text-center">
                                        <div className={`text-[12px] font-black transition-colors ${isCurrent ? 'text-primary scale-110' : isCompleted ? 'text-foreground' : 'text-foreground/30'}`}>
                                            {stage.label}
                                        </div>
                                    </div>
                                </div>

                                {!isLast && (
                                    <div className="flex-grow mx-2 h-1 bg-secondary/50 rounded-full relative -mt-6">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${stages[idx].color}`}
                                            style={{ width: isCompleted ? '100%' : '0%' }}
                                        />
                                        <ChevronRight className={`absolute top-1/2 -translate-y-1/2 right-0 w-4 h-4 ${isCompleted ? 'text-primary' : 'text-foreground/10'}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-primary border-l-4 border-primary pl-3">基本資料</h3>
                    <label className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs font-bold border border-primary/20">
                        <span>📄 重新讀取案件單 (.docx)</span>
                        <input
                            type="file"
                            accept=".docx"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={loading}
                        />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">案件編號</label>
                        <input
                            name="case_number"
                            defaultValue={initialData.case_number}
                            type="text"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">承辦地點</label>
                        <select
                            name="city"
                            defaultValue={initialData.city || '台北(士)'}
                            className="w-full text-lg font-bold bg-secondary/30 border-2 border-primary/20 rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        >
                            <option value="台北(士)">台北(士)</option>
                            <option value="台北(內)">台北(內)</option>
                            <option value="新北(內)">新北(內)</option>
                        </select>
                        <input type="hidden" name="district" value="" />
                        {/* Old UI for reference only, functionality replaced by single select above
                         <div className="flex gap-2">
                            <select ...> ... </select>
                            <input ... />
                         </div>
                        */}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">買方</label>
                        <input
                            name="buyer"
                            defaultValue={initialData.buyer_name}
                            type="text"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">賣方</label>
                        <input
                            name="seller"
                            defaultValue={initialData.seller_name}
                            type="text"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">成交總價 (萬)</label>
                        <input
                            name="total_price"
                            defaultValue={financials?.total_price}
                            type="number"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-emerald-600 uppercase">預收規費</label>
                        <input
                            name="pre_collected_fee"
                            defaultValue={financials?.pre_collected_fee}
                            type="number"
                            step="0.1"
                            placeholder="輸入 5 代表 5萬"
                            onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0 && val < 100) {
                                    e.target.value = (val * 10000).toString();
                                }
                            }}
                            className="w-full bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-700 font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">買方貸款銀行</label>
                        <input
                            name="buyer_loan_bank"
                            defaultValue={financials?.buyer_bank}
                            type="text"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-orange-600 uppercase">賣方代償銀行</label>
                        <input
                            name="seller_loan_bank"
                            defaultValue={financials?.seller_bank}
                            type="text"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 border-orange-200 focus:ring-2 focus:ring-orange-200 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">稅單性質</label>
                        <select
                            name="tax_type"
                            defaultValue={initialData.tax_type || '一般'}
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        >
                            <option value="一般">一般</option>
                            <option value="一生一次">一生一次</option>
                            <option value="一生一屋">一生一屋</option>
                            <option value="道路用地">道路用地</option>
                            <option value="一生一次+道路用地">一生一次+道路用地</option>
                            <option value="一生一屋+道路用地">一生一屋+道路用地</option>
                        </select>
                    </div>
                </div>

                {/* --- Custom Attributes (Inspired by Twenty) --- */}
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl mt-6 shadow-inner overflow-hidden transition-all">
                    <div
                        className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                        onClick={() => setIsAttributesExpanded(!isAttributesExpanded)}
                    >
                        <div className="flex items-center gap-2">
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isAttributesExpanded ? 'rotate-180' : ''}`} />
                            <h4 className="text-sm font-black text-slate-500 tracking-widest uppercase">
                                ⚙️ 自定義屬性 (Case Attributes)
                            </h4>
                            {Object.keys(attributes).length > 0 && (
                                <span className="text-[10px] bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                    {Object.keys(attributes).length}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">EXPERIMENTAL</span>
                            {isAttributesExpanded && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const key = prompt('請輸入新欄位名稱 (例如：案件來源、居留證號):');
                                        if (key) setAttributes(prev => ({ ...prev, [key]: '' }));
                                    }}
                                    className="text-[11px] font-black bg-white dark:bg-slate-800 text-slate-600 px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm active:scale-95"
                                >
                                    ＋ 新增欄位
                                </button>
                            )}
                        </div>
                    </div>

                    {isAttributesExpanded && (
                        <div className="p-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                                {Object.entries(attributes).map(([key, value]) => (
                                    <div key={key} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-sm group hover:border-primary/30 transition-all">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{key}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (confirm(`確定刪除「${key}」欄位嗎？內容將遺失。`)) {
                                                        const newAttrs = { ...attributes };
                                                        delete newAttrs[key];
                                                        setAttributes(newAttrs);
                                                    }
                                                }}
                                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="text-xs">✕</span>
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => setAttributes(prev => ({ ...prev, [key]: e.target.value }))}
                                            placeholder="輸入內容..."
                                            className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 focus:outline-none placeholder:text-slate-300 text-slate-700 dark:text-slate-200"
                                        />
                                    </div>
                                ))}
                                {Object.keys(attributes).length === 0 && (
                                    <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                        <p className="text-xs text-slate-400 italic">目前沒有自定義屬性。使用右上方按鈕為此案件建立專屬欄位。</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-accent border-l-4 border-accent pl-3">辦事清單 (Checklist)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-border-color rounded-xl bg-secondary/20">
                        <h4 className="text-xs font-black text-foreground/40 mb-2 uppercase">簽約與用印階段</h4>
                        <CaseTodos
                            caseId={initialData.id}
                            initialTodos={initialData.todos || {}}
                            items={[
                                '買方蓋印章',
                                '賣方蓋印章',
                                '用印款',
                                '完稅款',
                                '權狀印鑑',
                                '授權',
                                '解約排除',
                                '規費',
                                '設定',
                                '稅單',
                                '差額',
                                '整過戶',
                            ]}
                            hideCompleted={false}
                        />
                    </div>
                    <div className="p-4 border border-border-color rounded-xl bg-secondary/20">
                        <h4 className="text-xs font-black text-foreground/40 mb-2 uppercase">過戶與交屋階段</h4>
                        <CaseTodos
                            caseId={initialData.id}
                            initialTodos={initialData.todos || {}}
                            items={[
                                '整交屋',
                                '實登',
                                '打單',
                                '履保',
                                '水電',
                                '稅費分算',
                                '保單',
                                '代償',
                                '塗銷',
                                '二撥',
                            ]}
                            hideCompleted={false}
                        />
                    </div>
                </div>
            </div>

            <div className="border-t border-border-color"></div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-amber-600 border-l-4 border-amber-500 pl-3">進度日期</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-600">簽約日/款</label>
                        <input
                            name="contract_date"
                            defaultValue={toISODate(milestones?.contract_date)}
                            type="date"
                            id="contract_date_input"
                            onBlur={(e) => {
                                // 當簽約日改變時，可以觸發一些提示，或者使用者點擊自動推算
                            }}
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs focus:ring-1 focus:ring-primary/30 outline-none"
                            required
                        />
                        <input
                            name="contract_amount"
                            defaultValue={milestones?.contract_amount}
                            type="number"
                            step="0.1"
                            placeholder="金額"
                            className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-600">補差額/款</label>
                        <input
                            name="sign_diff_date"
                            defaultValue={toISODate(milestones?.sign_diff_date)}
                            type="date"
                            className="w-full bg-secondary/20 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                        <input
                            name="sign_diff_amount"
                            defaultValue={milestones?.sign_diff_amount}
                            type="number"
                            step="0.1"
                            placeholder="補差額"
                            className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-blue-600">用印日/款</label>
                        <input
                            name="seal_date"
                            defaultValue={toISODate(milestones?.seal_date)}
                            type="date"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                        <input
                            name="seal_amount"
                            defaultValue={milestones?.seal_amount}
                            type="number"
                            step="0.1"
                            placeholder="金額"
                            className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-emerald-600">完稅日/款</label>
                        <input
                            name="tax_payment_date"
                            defaultValue={toISODate(milestones?.tax_payment_date)}
                            type="date"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                        <input
                            name="tax_amount"
                            defaultValue={milestones?.tax_amount}
                            type="number"
                            step="0.1"
                            placeholder="金額"
                            className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/40 flex justify-between">
                            <span>過戶日</span>
                            <span className="text-[9px] text-purple-500">備註</span>
                        </label>
                        <input
                            name="transfer_date"
                            defaultValue={toISODate(milestones?.transfer_date)}
                            type="date"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        />
                        <div className="space-y-1">
                            <input
                                name="transfer_note"
                                value={transferNote}
                                onChange={(e) => setTransferNote(e.target.value)}
                                type="text"
                                placeholder="備註..."
                                className="w-full bg-secondary/20 border border-border-color rounded px-2 py-2 text-xs focus:bg-white/50 transition-all outline-none"
                            />
                            <div className="flex flex-wrap gap-1">
                                {['訴訟', '卡營業登記', '報拆延', '外案', '重要', '不重要'].map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setTransferNote((p) => (p ? `${p} ${tag}` : tag))}
                                        className="text-[10px] px-1.5 py-0.5 bg-purple-50 hover:bg-purple-500 hover:text-white text-purple-600 rounded border border-purple-100 transition-all"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-red-600">代償/交屋/尾款</label>
                        <input
                            name="redemption_date"
                            defaultValue={toISODate(milestones?.redemption_date)}
                            type="date"
                            className="w-full bg-secondary/20 border border-border-color rounded px-2 py-2 text-xs outline-none"
                            title="代償日"
                        />
                        <input
                            name="handover_date"
                            defaultValue={toISODate(milestones?.handover_date)}
                            type="date"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                            required
                            title="交屋日 (尾款日)"
                        />
                        <input
                            name="balance_amount"
                            defaultValue={milestones?.balance_amount}
                            type="number"
                            step="0.1"
                            placeholder="尾款金額"
                            className="w-full bg-white/50 border border-secondary-color rounded px-2 py-2 text-xs outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* 與客戶約定時間 (Appointments) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-600 border-l-4 border-indigo-500 pl-3">
                    與客戶約定時間 (Appointments)
                </h3>
                <p className="text-xs text-foreground/50">
                    請設定與客戶見面的具體時間 (精確到分)，系統將於前 3 天提醒。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-indigo-600">用印約定</label>
                        <input
                            name="seal_appointment"
                            defaultValue={toISODatetime(milestones?.seal_appointment)}
                            type="datetime-local"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-300 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-indigo-600">完稅約定</label>
                        <input
                            name="tax_appointment"
                            defaultValue={toISODatetime(milestones?.tax_appointment)}
                            type="datetime-local"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-300 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-indigo-600">交屋約定</label>
                        <input
                            name="handover_appointment"
                            defaultValue={toISODatetime(milestones?.handover_appointment)}
                            type="datetime-local"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-300 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* 稅單限繳日期 (Tax Deadlines) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-rose-600 border-l-4 border-rose-500 pl-3">
                    稅單限繳日期 (Tax Deadlines)
                </h3>
                <p className="text-xs text-foreground/50">設定限繳日後，系統將於前 5 天開始提醒。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <label className="text-xs font-bold text-rose-600">土增稅限繳日 (常用)</label>
                            {((initialData as any).todos || []).find((t: any) => t.source_key === 'land_value_tax_deadline')?.is_completed && (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                        </div>
                        <input
                            name="land_value_tax_deadline"
                            defaultValue={toISODate(financials?.land_value_tax_deadline)}
                            type="date"
                            className="w-full bg-rose-50/50 border border-rose-200 rounded px-2 py-2 text-sm focus:ring-1 focus:ring-rose-300 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <label className="text-xs font-bold text-rose-600">契稅限繳日 (常用)</label>
                            {((initialData as any).todos || []).find((t: any) => t.source_key === 'deed_tax_deadline')?.is_completed && (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                        </div>
                        <input
                            name="deed_tax_deadline"
                            defaultValue={toISODate(financials?.deed_tax_deadline)}
                            type="date"
                            className="w-full bg-rose-50/50 border border-rose-200 rounded px-2 py-2 text-sm focus:ring-1 focus:ring-rose-300 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <label className="text-xs font-bold text-gray-500">地價稅限繳日</label>
                            {((initialData as any).todos || []).find((t: any) => t.source_key === 'land_tax_deadline')?.is_completed && (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                        </div>
                        <input
                            name="land_tax_deadline"
                            defaultValue={toISODate(financials?.land_tax_deadline)}
                            type="date"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-gray-300 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <label className="text-xs font-bold text-gray-500">房屋稅限繳日</label>
                            {((initialData as any).todos || []).find((t: any) => t.source_key === 'house_tax_deadline')?.is_completed && (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                        </div>
                        <input
                            name="house_tax_deadline"
                            defaultValue={toISODate(financials?.house_tax_deadline)}
                            type="date"
                            className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-gray-300 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="border-t border-border-color"></div>

            <div className="py-4">
                <CaseScheduleManager caseId={initialData.id} />
            </div>

            <div className="border-t border-border-color"></div>

            {currentUserEmail === 'tom890108159@gmail.com' && (
                <>
                    <div className="py-4">
                        <CaseMessageGenerator caseData={initialData} />
                    </div>
                    <div className="border-t border-border-color"></div>
                </>
            )}

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-rose-500">⚠️ 應注意 (Attention)</h4>
                        <textarea
                            name="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={10}
                            className="w-full bg-secondary/40 border-2 border-rose-100 rounded-xl p-3 text-sm"
                        />
                        <QuickNotes onSelect={(note) => setNotes((p) => (p ? `${p}\n${note}` : note))} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-accent">目前狀態</h4>
                        <select
                            name="status"
                            defaultValue={initialData.status}
                            className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm cursor-pointer mb-4"
                        >
                            <option value="Processing">辦理中</option>
                            <option value="Closed">結案</option>
                        </select>
                        <h4 className="text-sm font-bold text-foreground/40">其他代辦事項</h4>
                        <textarea
                            name="pending_tasks"
                            defaultValue={initialData.pending_tasks}
                            rows={10}
                            className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm"
                        />
                    </div>
                </div>

                {/* Private Notes Section - Full Width */}
                <div className="space-y-2 pt-2 pb-4">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            🔒 詳細備註與特殊條款 (Private Notes)
                        </h4>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            不會顯示在列表
                        </span>
                    </div>
                    <textarea
                        name="private_notes"
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        rows={12}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="此欄位適合紀錄：
1. 複雜的合約條款
2. 案件的詳細處理經過
3. 目前遭遇的困難點
4. 任何需要長篇幅記錄但不希望干擾列表顯示的內容"
                    />
                </div>

                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground/40">塗銷方式</h4>
                    <select
                        name="cancellation_type"
                        defaultValue={initialData.cancellation_type || '代書塗銷'}
                        className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm cursor-pointer"
                    >
                        <option value="代書塗銷">代書塗銷</option>
                        <option value="賣方自辦">賣方自辦</option>
                        <option value="無">無</option>
                    </select>
                </div>
            </div>



            {/* 日期更動紀錄 (Audit Log) */}
            {(initialData as any).case_date_logs && (initialData as any).case_date_logs.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-500 border-l-4 border-gray-400 pl-3">
                        日期更動紀錄 (Change Log)
                    </h3>
                    <div className="bg-secondary/20 rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                        {(initialData as any).case_date_logs.map((log: any) => (
                            <div key={log.id} className="text-xs text-foreground/70 border-b border-border/50 pb-1">
                                <span className="font-bold text-primary">{log.field_name}</span>:
                                <span className="line-through mx-2 text-red-400">{log.old_value || '(空)'}</span>➔
                                <span className="font-bold text-green-600 mx-2">{log.new_value}</span>
                                <span className="text-[10px] text-gray-400">
                                    ({new Date(log.changed_at).toLocaleString('zh-TW')})
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-8 flex flex-col md:flex-row justify-between gap-6 md:gap-4">
                <div className="flex flex-col gap-2 w-full md:w-auto order-2 md:order-1">
                    {showDeleteConfirm ? (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 w-full md:w-auto">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-bold"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={performDelete}
                                disabled={loading}
                                className="flex-1 md:flex-none px-6 py-2 rounded-lg bg-red-600 text-white text-sm font-black shadow-lg shadow-red-500/30 active:scale-95"
                            >
                                {loading ? '處理中...' : '確認刪除'}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={loading}
                            className="w-full md:w-auto px-6 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold border border-red-100 flex items-center justify-center gap-2"
                        >
                            🗑️ 刪除案件
                        </button>
                    )}
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-4">
                        <Link
                            href="/cases"
                            className="flex-1 md:flex-none px-6 py-3 rounded-xl hover:bg-secondary transition-all text-sm font-bold border border-transparent flex items-center justify-center"
                        >
                            取消編輯
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 md:flex-none bg-primary hover:bg-primary-deep text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex justify-center"
                        >
                            {loading ? '儲存中...' : '✅ 儲存並返回'}
                        </button>
                    </div>
                    {saveStatus !== 'idle' && (
                        <span className={`text-[10px] font-bold flex items-center gap-1 animate-fade-in ${saveStatus === 'saving' ? 'text-blue-500' :
                            saveStatus === 'saved' ? 'text-green-500' : 'text-red-500'
                            }`}>
                            {saveStatus === 'saving' && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                            {saveStatus === 'saved' && '✓ 已自動儲存'}
                            {saveStatus === 'saving' && '正在自動備份...'}
                            {saveStatus === 'error' && '⚠ 自動存檔失敗'}
                            {saveStatus === 'saved' && lastSaved && ` (${lastSaved.toLocaleTimeString()})`}
                        </span>
                    )}
                </div>
            </div>
        </form>
    );
}
