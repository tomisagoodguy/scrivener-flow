'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';
import { parseDocx } from '@/app/actions/parseDocx';
import { parseAttributes, stripAttributesFromNotes, stripHtml } from './caseUtils';
import { caseService } from '@/services/caseService';
import { useCaseAutoSave } from './useCaseAutoSave';

/**
 * 編輯案件邏輯 Hook
 * 已將資料持久化邏輯提取至 caseService，自動存檔邏輯提取至 useCaseAutoSave
 */
export function useEditCase(initialData: DemoCase) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState(stripHtml(initialData.notes || ''));
    const [transferNote, setTransferNote] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [debugInfo, setDebugInfo] = useState('');
    const [privateNotes, setPrivateNotes] = useState(stripHtml(initialData.private_notes || ''));
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [attributes, setAttributes] = useState<Record<string, any>>({});
    const [isAttributesExpanded, setIsAttributesExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // --- 初始化資料 ---
    useEffect(() => {
        if (initialData.notes) {
            setAttributes(parseAttributes(initialData.notes));
            setNotes(stripHtml(stripAttributesFromNotes(initialData.notes)));
        }

        const m = initialData.milestones?.[0] || {};
        // 這裡暫時使用類型斷言，因為 Milestone 的結構可能比較複雜
        setTransferNote((m as Record<string, unknown>).transfer_note as string || '');

        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.email) {
                setCurrentUserEmail(data.user.email);
            }
        });
    }, [initialData.id, initialData.notes, initialData.milestones]);

    // --- 自動存檔邏輯 ---
    const { saveStatus, lastSaved } = useCaseAutoSave({
        supabase,
        caseId: initialData.id,
        notes,
        privateNotes,
        attributes,
        initialNotes: initialData.notes || '',
        initialPrivateNotes: initialData.private_notes || ''
    });

    /**
     * 處理表單提交
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrorMsg('');
        setDebugInfo('正在準備儲存...');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;
        const fullNotes = `${notes}\n\n[[ATTR:${JSON.stringify(attributes)}]]`.trim();

        try {
            setDebugInfo('正在更新案件與明細...');
            const { milestoneData, financialData } = await caseService.updateCaseComplete(
                supabase,
                initialData.id,
                data,
                fullNotes,
                privateNotes
            );

            setDebugInfo('正在同步待辦事項...');
            await caseService.syncSystemTodos(
                supabase,
                initialData.id,
                data.buyer?.toString(),
                milestoneData,
                financialData
            );

            setDebugInfo('儲存成功，正跳轉中...');
            router.push('/cases');
            router.refresh();
        } catch (error: unknown) {
            console.error('Submit Error:', error);
            const err = error as { code?: string; message?: string };
            setErrorMsg(`儲存失敗 (${err.code || 'UNKNOWN'}): ${err.message || '發生未知錯誤'}`);
            setLoading(false);
        }
    };

    /**
     * 執行刪除流程
     */
    const performDelete = async () => {
        setLoading(true);
        setErrorMsg('');
        setDebugInfo('開始執行刪除流程...');
        try {
            await caseService.deleteCase(supabase, initialData.id);
            router.push('/cases');
            router.refresh();
        } catch (error: unknown) {
            const err = error as { message?: string };
            setErrorMsg(`刪除失敗: ${err.message || '未知錯誤'}`);
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    /**
     * 處理文件解析並填充表單
     */
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
                const setVal = (name: string, val?: string | number | null) => {
                    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
                    if (el && val !== undefined && val !== null) {
                        el.value = val.toString();
                        if (name === 'notes') setNotes(val.toString());
                    }
                };
                if (parsedData.case_number) setVal('case_number', parsedData.case_number);
                if (parsedData.buyer_name) {
                    setVal('buyer', parsedData.buyer_name);
                    setVal('buyer_name', parsedData.buyer_name);
                }
                if (parsedData.buyer_phone) setVal('buyer_phone', parsedData.buyer_phone);
                if (parsedData.seller_name) {
                    setVal('seller', parsedData.seller_name);
                    setVal('seller_name', parsedData.seller_name);
                }
                if (parsedData.seller_phone) setVal('seller_phone', parsedData.seller_phone);
                if (parsedData.escrow_account) setVal('escrow_account', parsedData.escrow_account);
                if (parsedData.registrant_name) setVal('registrant_name', parsedData.registrant_name);
                if (parsedData.registrant_phone) setVal('registrant_phone', parsedData.registrant_phone);
                if (parsedData.agent_name) setVal('agent_name', parsedData.agent_name);
                if (parsedData.agent_phone) setVal('agent_phone', parsedData.agent_phone);
                if (parsedData.contract_date) setVal('contract_date', parsedData.contract_date);
                if (parsedData.total_price) setVal('total_price', parsedData.total_price);
                if (parsedData.seal_date) setVal('seal_date', parsedData.seal_date);
                if (parsedData.tax_payment_date) setVal('tax_payment_date', parsedData.tax_payment_date);
                if (parsedData.transfer_date) setVal('transfer_date', parsedData.transfer_date);
                if (parsedData.handover_date) setVal('handover_date', parsedData.handover_date);
                alert('✅ 資料讀取完成！');
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            alert('解析失敗: ' + (error.message || '未知錯誤'));
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
