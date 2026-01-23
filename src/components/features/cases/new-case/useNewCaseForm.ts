import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CaseFormData, initialFormData } from './types';

/**
 * useNewCaseForm Hook
 * 處理新增案件表單的所有邏輯
 */
export function useNewCaseForm() {
    const router = useRouter();
    const [formData, setFormData] = useState<CaseFormData>(initialFormData);
    const [errorMsg, setErrorMsg] = useState('');
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [suggestedNum, setSuggestedNum] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    /**
     * 初始化：抓取最新案號並建議下一個序號
     */
    useEffect(() => {
        const fetchLatest = async () => {
            const { data } = await supabase
                .from('cases')
                .select('case_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data?.case_number) {
                const match = data.case_number.match(/(\d+)$/);
                if (match) {
                    const num = parseInt(match[1]);
                    const nextNum = (num + 1).toString().padStart(match[1].length, '0');
                    const suggested = data.case_number.replace(/\d+$/, nextNum);
                    setSuggestedNum(suggested);
                }
            }
        };
        fetchLatest();
    }, []);

    /**
     * 處理表單欄位變更
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'case_number') {
            checkDuplicate(value);
        }
    };

    /**
     * 檢查案號是否重複
     */
    const checkDuplicate = async (caseNum: string) => {
        if (!caseNum) {
            setIsDuplicate(false);
            if (errorMsg.includes('案號')) setErrorMsg('');
            return;
        }
        setIsChecking(true);
        const { data, error } = await supabase
            .from('cases')
            .select('id')
            .eq('case_number', caseNum)
            .maybeSingle();

        if (data) {
            setIsDuplicate(true);
            setErrorMsg(`❌ 案號 「${caseNum}」 已經存在，請更換一個案號。`);
        } else {
            setIsDuplicate(false);
            if (!errorMsg.includes('資料庫建立失敗')) setErrorMsg('');
        }
        setIsChecking(false);
    };

    /**
     * 核心儲存邏輯：單一案件儲存
     */
    const saveCaseData = async (data: CaseFormData) => {
        const formatDate = (val: string) => (val ? val : null);
        const { data: { user } } = await supabase.auth.getUser();

        // 1. 建立或更新 Case
        const casePayload = {
            case_number: data.case_number,
            buyer_name: data.buyer_name,
            buyer_phone: data.buyer_phone || null,
            seller_name: data.seller_name,
            seller_phone: data.seller_phone || null,
            escrow_account: data.escrow_account,
            registrant_name: data.registrant_name,
            registrant_phone: data.registrant_phone,
            agent_name: data.agent_name,
            agent_phone: data.agent_phone,
            status: data.status,
            city: data.city,
            district: data.district,
            notes: data.notes,
            tax_type: data.tax_type,
            user_id: user?.id,
        };

        const { data: existingCase } = await supabase
            .from('cases')
            .select('id')
            .eq('case_number', data.case_number)
            .maybeSingle();

        let targetCase;
        if (existingCase) {
            const { data: updatedCase, error: caseError } = await supabase
                .from('cases')
                .update(casePayload)
                .eq('id', existingCase.id)
                .select()
                .single();
            if (caseError) throw caseError;
            targetCase = updatedCase;
        } else {
            const { data: insertedCase, error: caseError } = await supabase
                .from('cases')
                .insert([casePayload])
                .select()
                .single();
            if (caseError) throw caseError;
            targetCase = insertedCase;
        }

        // 2. Upsert Milestones
        const milestonePayload = {
            case_id: targetCase.id,
            contract_date: formatDate(data.contract_date),
            seal_date: formatDate(data.seal_date),
            tax_payment_date: formatDate(data.tax_payment_date),
            transfer_date: formatDate(data.transfer_date),
            balance_payment_date: formatDate(data.balance_payment_date),
            redemption_date: formatDate(data.redemption_date),
            handover_date: formatDate(data.handover_date),
            transfer_note: data.transfer_note || null,
            contract_amount: data.contract_amount ? Number(data.contract_amount) : null,
            sign_diff_date: formatDate(data.sign_diff_date),
            sign_diff_amount: data.sign_diff_amount ? Number(data.sign_diff_amount) : null,
            seal_amount: data.seal_amount ? Number(data.seal_amount) : null,
            tax_amount: data.tax_amount ? Number(data.tax_amount) : null,
            balance_amount: data.balance_amount ? Number(data.balance_amount) : null,
        };

        const { data: existingMilestone } = await supabase.from('milestones').select('id').eq('case_id', targetCase.id).maybeSingle();
        const milestoneResult = existingMilestone
            ? await supabase.from('milestones').update(milestonePayload).eq('id', existingMilestone.id)
            : await supabase.from('milestones').insert([milestonePayload]);
        if (milestoneResult.error) throw milestoneResult.error;

        // 3. Upsert Financials
        const financialsPayload = {
            case_id: targetCase.id,
            total_price: data.total_price ? Number(data.total_price) : null,
            buyer_bank: data.buyer_loan_bank || null,
            seller_bank: data.seller_loan_bank || null,
        };

        const { data: existingFin } = await supabase.from('financials').select('id').eq('case_id', targetCase.id).maybeSingle();
        const finResult = existingFin
            ? await supabase.from('financials').update(financialsPayload).eq('id', existingFin.id)
            : await supabase.from('financials').insert([financialsPayload]);
        if (finResult.error) throw finResult.error;

        return targetCase;
    };

    /**
     * 處理表單提交
     */
    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setLoading(true);
            await saveCaseData(formData);
            router.push('/cases?status=Processing');
            router.refresh();
        } catch (error: any) {
            console.error('Submit Error:', error);
            setErrorMsg('發生錯誤：' + (error.message || JSON.stringify(error)));
            setLoading(false);
        }
    }, [formData, router]);

    return {
        formData,
        setFormData,
        errorMsg,
        isDuplicate,
        isChecking,
        suggestedNum,
        loading,
        setLoading,
        handleChange,
        checkDuplicate,
        handleSubmit,
        saveCaseData,
    };
}
