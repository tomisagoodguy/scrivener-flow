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
     * 處理表單提交
     */
    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('>>> handleSubmit triggered with state:', formData);

        try {
            setLoading(true);
            const formatDate = (val: string) => (val ? val : null);

            console.log('Preparing insert payload...');

            // 1. 建立或更新 Case
            const casePayload = {
                case_number: formData.case_number,
                buyer_name: formData.buyer_name,
                buyer_phone: formData.buyer_phone || null,
                seller_name: formData.seller_name,
                seller_phone: formData.seller_phone || null,
                escrow_account: formData.escrow_account,
                registrant_name: formData.registrant_name,
                registrant_phone: formData.registrant_phone,
                agent_name: formData.agent_name,
                agent_phone: formData.agent_phone,
                status: formData.status,
                city: formData.city,
                district: formData.district,
                notes: formData.notes,
                tax_type: formData.tax_type,
                user_id: (await supabase.auth.getUser()).data.user?.id,
            };

            if (!casePayload.user_id) {
                console.warn('⚠️ Creating case without user_id (Not logged in)');
            }

            console.log('Inserting Case Payload:', casePayload);

            const { data: existingCase } = await supabase
                .from('cases')
                .select('id')
                .eq('case_number', formData.case_number)
                .maybeSingle();

            let newCase;
            if (existingCase) {
                console.log('Case already exists, updating instead of inserting...', existingCase.id);
                const { data: updatedCase, error: caseError } = await supabase
                    .from('cases')
                    .update(casePayload)
                    .eq('id', existingCase.id)
                    .select()
                    .single();
                if (caseError) throw caseError;
                newCase = updatedCase;
            } else {
                const { data: insertedCase, error: caseError } = await supabase
                    .from('cases')
                    .insert([casePayload])
                    .select()
                    .single();

                if (caseError) {
                    console.error('Supabase Case Error (Raw):', JSON.stringify(caseError, null, 2));

                    const errorTitle = '資料庫建立失敗';
                    let displayMsg = '';

                    if (caseError.code === '23505') {
                        displayMsg = `❌ 案號 「${formData.case_number}」 已經存在，請更換一個案號。`;
                    } else {
                        const errMsg = caseError.message || '未知錯誤 (Unknown Error)';
                        displayMsg = `${errorTitle}:\n[${caseError.code || 'NULL'}] ${errMsg}`;
                    }

                    setErrorMsg(displayMsg);
                    setLoading(false);
                    return;
                }
                newCase = insertedCase;
            }

            if (!newCase) throw new Error('案件建立或更新後無回傳資料');

            // 2. Upsert Milestones
            const milestonePayload = {
                case_id: newCase.id,
                contract_date: formatDate(formData.contract_date),
                seal_date: formatDate(formData.seal_date),
                tax_payment_date: formatDate(formData.tax_payment_date),
                transfer_date: formatDate(formData.transfer_date),
                balance_payment_date: formatDate(formData.balance_payment_date),
                redemption_date: formatDate(formData.redemption_date),
                handover_date: formatDate(formData.handover_date),
                transfer_note: formData.transfer_note || null,
                contract_amount: formData.contract_amount ? Number(formData.contract_amount) : null,
                sign_diff_date: formatDate(formData.sign_diff_date),
                sign_diff_amount: formData.sign_diff_amount ? Number(formData.sign_diff_amount) : null,
                seal_amount: formData.seal_amount ? Number(formData.seal_amount) : null,
                tax_amount: formData.tax_amount ? Number(formData.tax_amount) : null,
                balance_amount: formData.balance_amount ? Number(formData.balance_amount) : null,
            };

            console.log('Upserting Milestone Payload:', milestonePayload);

            const { data: existingMilestone } = await supabase.from('milestones').select('id').eq('case_id', newCase.id).maybeSingle();

            const milestoneResult = existingMilestone
                ? await supabase.from('milestones').update(milestonePayload).eq('id', existingMilestone.id)
                : await supabase.from('milestones').insert([milestonePayload]);

            if (milestoneResult.error) {
                console.error('Milestone Error:', milestoneResult.error);
                const mDetails = JSON.stringify(milestoneResult.error, Object.getOwnPropertyNames(milestoneResult.error));
                setErrorMsg(
                    (prev) => (prev ? prev + '\n\n' : '') + '里程碑資料儲存失敗 (Milestone Error):\n' + mDetails
                );
                setLoading(false);
                return;
            }

            // 3. Upsert Financials
            const financialsPayload = {
                case_id: newCase.id,
                total_price: formData.total_price ? Number(formData.total_price) : null,
                buyer_bank: formData.buyer_loan_bank || null,
                seller_bank: formData.seller_loan_bank || null,
            };

            console.log('Upserting Financials Payload:', financialsPayload);
            const { data: existingFin } = await supabase.from('financials').select('id').eq('case_id', newCase.id).maybeSingle();

            const finResult = existingFin
                ? await supabase.from('financials').update(financialsPayload).eq('id', existingFin.id)
                : await supabase.from('financials').insert([financialsPayload]);

            if (finResult.error) {
                console.error('Financial Error', finResult.error);
                setErrorMsg(
                    (prev) => (prev ? prev + '\n\n' : '') + '財務資料儲存失敗 (Financial Error):\n' + finResult.error.message
                );
                setLoading(false);
                return;
            }

            router.push('/cases?status=Processing');
            router.refresh();
        } catch (error: any) {
            console.error('Catch Error:', error);
            setErrorMsg('發生未預期的錯誤 (Catch):\n' + (error.message || JSON.stringify(error)));
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
    };
}
