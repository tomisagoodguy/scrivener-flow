import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 案件相關資料結構
 */
export interface MilestoneData {
    case_id: string;
    contract_date: string | null;
    contract_amount: number | null;
    sign_diff_date: string | null;
    sign_diff_amount: number | null;
    seal_date: string | null;
    seal_amount: number | null;
    tax_payment_date: string | null;
    tax_amount: number | null;
    transfer_date: string | null;
    transfer_note: string | null;
    balance_amount: number | null;
    handover_date: string | null;
    redemption_date: string | null;
    sign_appointment: string | null;
    seal_appointment: string | null;
    tax_appointment: string | null;
    handover_appointment: string | null;
}

export interface FinancialData {
    case_id: string;
    total_price: number | null;
    pre_collected_fee: number | null;
    buyer_bank: string | null;
    seller_bank: string | null;
    land_value_tax_deadline: string | null;
    deed_tax_deadline: string | null;
    land_tax_deadline: string | null;
    house_tax_deadline: string | null;
}

/**
 * 案件服務層 - 專門處理與 Supabase 的互動邏輯
 */
export const caseService = {
    /**
     * 更新案件的所有相關資料（cases, milestones, financials）
     */
    async updateCaseComplete(
        supabase: SupabaseClient,
        caseId: string,
        data: Record<string, FormDataEntryValue>,
        notes: string,
        privateNotes: string
    ) {
        // 1. 更新案件主體
        const { error: caseError } = await supabase
            .from('cases')
            .update({
                case_number: data.case_number,
                city: data.city,
                district: data.district,
                buyer_name: data.buyer,
                seller_name: data.seller,
                status: data.status,
                notes,
                private_notes: privateNotes,
                pending_tasks: data.pending_tasks,
                is_back_rent: data.is_back_rent === 'on',
                tax_type: data.tax_type,
                cancellation_type: data.cancellation_type,
                updated_at: new Date().toISOString(),
            })
            .eq('id', caseId);

        if (caseError) throw caseError;

        // 2. 更新或插入進度 (milestones)
        const milestoneData = this._formatMilestoneData(caseId, data);
        const { data: mCheck } = await supabase.from('milestones').select('id').eq('case_id', caseId).maybeSingle();

        if (mCheck) {
            const { error: me } = await supabase.from('milestones').update(milestoneData).eq('id', mCheck.id);
            if (me) throw me;
        } else {
            const { error: me } = await supabase.from('milestones').insert([milestoneData]);
            if (me) throw me;
        }

        // 3. 更新或插入財務 (financials)
        const financialData = this._formatFinancialData(caseId, data);
        const { data: fCheck } = await supabase.from('financials').select('id').eq('case_id', caseId).maybeSingle();

        if (fCheck) {
            const { error: fe } = await supabase.from('financials').update(financialData).eq('id', fCheck.id);
            if (fe) throw fe;
        } else {
            const { error: fe } = await supabase.from('financials').insert([financialData]);
            if (fe) throw fe;
        }

        return { milestoneData, financialData };
    },

    /**
     * 同步系統生成的待辦事項 (Todos)
     */
    async syncSystemTodos(
        supabase: SupabaseClient,
        caseId: string,
        buyerName: string | undefined,
        milestoneData: MilestoneData,
        financialData: FinancialData
    ) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const todosToUpsert: Record<string, unknown>[] = [];
        const caseTitle = buyerName ? `${buyerName} 案` : '案件';

        const addSystemTodo = (key: string, dateVal: string | null, titleSuffix: string) => {
            if (!dateVal) return;
            const d = new Date(dateVal);
            const isDateTime = dateVal.includes('T');
            const dateDisplay = isDateTime
                ? d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });

            todosToUpsert.push({
                user_id: user.id,
                case_id: caseId,
                content: `${caseTitle} - ${titleSuffix} (${dateDisplay})`,
                due_date: dateVal,
                priority: 'urgent-important',
                source_type: 'system',
                source_key: key,
                is_completed: false,
                is_deleted: false,
            });
        };

        // 映射關係
        addSystemTodo('seal_appt', milestoneData.seal_appointment, '用印約定');
        addSystemTodo('tax_appt', milestoneData.tax_appointment, '完稅約定');
        addSystemTodo('handover_appt', milestoneData.handover_appointment, '交屋約定');
        addSystemTodo('land_val_tax', financialData.land_value_tax_deadline, '土增稅限繳');
        addSystemTodo('deed_tax', financialData.deed_tax_deadline, '契稅限繳');
        addSystemTodo('land_tax', financialData.land_tax_deadline, '地價稅限繳');
        addSystemTodo('house_tax', financialData.house_tax_deadline, '房屋稅限繳');

        if (todosToUpsert.length > 0) {
            const { data: existingTodos } = await supabase.from('todos')
                .select('id, source_key').eq('case_id', caseId).eq('source_type', 'system');

            const keyMap = new Map<string, string>();
            const idsToCleanup: string[] = [];
            (existingTodos || []).forEach((t: { id: string; source_key: string | null }) => {
                if (t.source_key) {
                    if (keyMap.has(t.source_key)) idsToCleanup.push(t.id);
                    else keyMap.set(t.source_key, t.id);
                }
            });

            if (idsToCleanup.length > 0) await supabase.from('todos').delete().in('id', idsToCleanup);

            const finalPayload = todosToUpsert.map(t => {
                const existingId = keyMap.get(t.source_key as string);
                return existingId ? { ...t, id: existingId } : t;
            });

            if (finalPayload.length > 0) await supabase.from('todos').upsert(finalPayload);
        }
    },

    /**
     * 刪除案件
     */
    async deleteCase(supabase: SupabaseClient, caseId: string) {
        await supabase.from('milestones').delete().eq('case_id', caseId);
        await supabase.from('financials').delete().eq('case_id', caseId);
        const { error } = await supabase.from('cases').delete().eq('id', caseId);
        if (error) throw error;
    },

    // --- Private Helpers ---

    _formatMilestoneData(caseId: string, data: Record<string, FormDataEntryValue>): MilestoneData {
        const formatDate = (val: FormDataEntryValue | undefined) => (val ? val.toString() : null);
        const formatDateTime = (val: FormDataEntryValue | undefined) => (val ? new Date(val as string).toISOString() : null);

        return {
            case_id: caseId,
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
            sign_appointment: formatDateTime(data.sign_appointment),
            seal_appointment: formatDateTime(data.seal_appointment),
            tax_appointment: formatDateTime(data.tax_appointment),
            handover_appointment: formatDateTime(data.handover_appointment),
        };
    },

    _formatFinancialData(caseId: string, data: Record<string, FormDataEntryValue>): FinancialData {
        const formatDate = (val: FormDataEntryValue | undefined) => (val ? val.toString() : null);
        return {
            case_id: caseId,
            total_price: data.total_price ? Number(data.total_price) : null,
            pre_collected_fee: data.pre_collected_fee ? Number(data.pre_collected_fee) : null,
            buyer_bank: data.buyer_loan_bank?.toString() || null,
            seller_bank: data.seller_loan_bank?.toString() || null,
            land_value_tax_deadline: formatDate(data.land_value_tax_deadline),
            deed_tax_deadline: formatDate(data.deed_tax_deadline),
            land_tax_deadline: formatDate(data.land_tax_deadline),
            house_tax_deadline: formatDate(data.house_tax_deadline),
        };
    }
};
