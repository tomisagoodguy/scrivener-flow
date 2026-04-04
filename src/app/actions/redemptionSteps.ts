'use server';

import { createClient } from '@/lib/supabase/server';
import { REDEMPTION_STEPS } from '@/lib/constants/caseConstants';
import type { RedemptionStep } from '@/types';

export async function initRedemptionSteps(caseId: string): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const rows = REDEMPTION_STEPS.map(step => ({
        case_id: caseId,
        user_id: user.id,
        step_number: step.step_number,
        is_done: false,
        note: null,
    }));

    const { error } = await supabase
        .from('redemption_steps')
        .upsert(rows, { onConflict: 'case_id,step_number', ignoreDuplicates: true });

    if (error) return { error: error.message };
    return {};
}

export async function getRedemptionSteps(caseId: string): Promise<{ data?: RedemptionStep[]; error?: string }> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('redemption_steps')
        .select('*')
        .eq('case_id', caseId)
        .order('step_number', { ascending: true });

    if (error) return { error: error.message };
    return { data: data as RedemptionStep[] };
}

export async function updateRedemptionStep(
    id: string,
    updates: { is_done?: boolean; note?: string | null }
): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { error } = await supabase
        .from('redemption_steps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return {};
}
