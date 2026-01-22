'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';
import { parseDocx } from '@/app/actions/parseDocx';
import { parseAttributes, stripAttributesFromNotes } from './caseUtils';

export function useEditCase(initialData: DemoCase) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState(initialData.notes || '');
    const [transferNote, setTransferNote] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [debugInfo, setDebugInfo] = useState('');
    const [privateNotes, setPrivateNotes] = useState(initialData.private_notes || '');
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [attributes, setAttributes] = useState<Record<string, string>>({});
    const [isAttributesExpanded, setIsAttributesExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        if (initialData.notes) {
            setAttributes(parseAttributes(initialData.notes));
            setNotes(stripAttributesFromNotes(initialData.notes));
        }
        const m = (initialData.milestones?.[0] || {}) as any;
        setTransferNote(m.transfer_note || '');

        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.email) {
                setCurrentUserEmail(data.user.email);
            }
        });
    }, [initialData.id, initialData.notes, initialData.milestones]);

    // --- Incremental Persistence (Auto-save) ---
    useEffect(() => {
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
                sign_appointment: data.sign_appointment ? new Date(data.sign_appointment as string).toISOString() : null,
                seal_appointment: data.seal_appointment ? new Date(data.seal_appointment as string).toISOString() : null,
                tax_appointment: data.tax_appointment ? new Date(data.tax_appointment as string).toISOString() : null,
                handover_appointment: data.handover_appointment ? new Date(data.handover_appointment as string).toISOString() : null,
            };

            const { data: mCheck } = await supabase.from('milestones').select('id').eq('case_id', initialData.id).maybeSingle();
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
                land_value_tax_deadline: formatDate(data.land_value_tax_deadline),
                deed_tax_deadline: formatDate(data.deed_tax_deadline),
                land_tax_deadline: formatDate(data.land_tax_deadline),
                house_tax_deadline: formatDate(data.house_tax_deadline),
            };

            const { data: fCheck } = await supabase.from('financials').select('id').eq('case_id', initialData.id).maybeSingle();
            if (fCheck) {
                const { error: fe } = await supabase.from('financials').update(financialData).eq('id', fCheck.id);
                if (fe) throw fe;
            } else {
                const { error: fe } = await supabase.from('financials').insert([financialData]);
                if (fe) throw fe;
            }

            setDebugInfo('正在同步行事曆與備忘 (todos)...');
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const todosToUpsert: any[] = [];
                const caseTitle = data.buyer ? `${data.buyer} 案` : '案件';

                const addSystemTodo = (key: string, dateVal: string | null, titleSuffix: string) => {
                    if (!dateVal) return;
                    const d = new Date(dateVal);
                    const isDateTime = dateVal.includes('T');
                    const dateDisplay = isDateTime
                        ? d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });

                    todosToUpsert.push({
                        user_id: user.id,
                        case_id: initialData.id,
                        content: `${caseTitle} - ${titleSuffix} (${dateDisplay})`,
                        due_date: dateVal,
                        priority: 'urgent-important',
                        source_type: 'system',
                        source_key: key,
                        is_completed: false,
                        is_deleted: false,
                    });
                };

                addSystemTodo('seal_appt', milestoneData.seal_appointment, '用印約定');
                addSystemTodo('tax_appt', milestoneData.tax_appointment, '完稅約定');
                addSystemTodo('handover_appt', milestoneData.handover_appointment, '交屋約定');
                addSystemTodo('land_val_tax', financialData.land_value_tax_deadline, '土增稅限繳');
                addSystemTodo('deed_tax', financialData.deed_tax_deadline, '契稅限繳');
                addSystemTodo('land_tax', financialData.land_tax_deadline, '地價稅限繳');
                addSystemTodo('house_tax', financialData.house_tax_deadline, '房屋稅限繳');

                if (todosToUpsert.length > 0) {
                    const { data: existingTodos } = await supabase.from('todos').select('id, source_key').eq('case_id', initialData.id).eq('source_type', 'system');
                    const keyMap = new Map();
                    const idsToCleanup: any[] = [];
                    (existingTodos || []).forEach((t: any) => {
                        if (t.source_key) {
                            if (keyMap.has(t.source_key)) idsToCleanup.push(t.id);
                            else keyMap.set(t.source_key, t.id);
                        }
                    });

                    if (idsToCleanup.length > 0) await supabase.from('todos').delete().in('id', idsToCleanup);

                    const finalPayload = todosToUpsert.map(t => {
                        const existingId = keyMap.get(t.source_key);
                        return existingId ? { ...t, id: existingId } : t;
                    });
                    if (finalPayload.length > 0) await supabase.from('todos').upsert(finalPayload);
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
        setLoading(true);
        setErrorMsg('');
        setDebugInfo('開始執行刪除流程...');
        try {
            await supabase.from('milestones').delete().eq('case_id', initialData.id);
            await supabase.from('financials').delete().eq('case_id', initialData.id);
            await supabase.from('cases').delete().eq('id', initialData.id);
            router.push('/cases');
            router.refresh();
        } catch (error: any) {
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
                    const el = form.elements.namedItem(name) as any;
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

    return {
        loading, notes, setNotes, transferNote, setTransferNote, errorMsg, debugInfo,
        privateNotes, setPrivateNotes, currentUserEmail, attributes, setAttributes,
        isAttributesExpanded, setIsAttributesExpanded, showDeleteConfirm, setShowDeleteConfirm,
        saveStatus, lastSaved, handleSubmit, performDelete, handleFileUpload
    };
}
