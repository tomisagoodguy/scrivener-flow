'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
    createHandoverFeeSchema,
    scrivenerNameSchema,
    type CreateHandoverFeeInput,
    type HandoverFee,
    type HandoverFeeWithNames,
    type Scrivener,
} from '@/domain/handover-fee/types';

type ActionResult = { success: true } | { success: false; error: string };
type DataResult<T> = { success: true; data: T } | { success: false; error: string };

const UNAUTHORIZED = { success: false, error: 'Unauthorized' } as const;
const NOT_FOUND = { success: false, error: '找不到紀錄，請重新整理' } as const;
const UNIQUE_VIOLATION = '23505';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const FEE_SELECT = `
    id, fee_date, object_number, payer_scrivener_id, payee_scrivener_id, amount, paid_at, note,
    payer:scriveners!handover_fees_payer_fk(name),
    payee:scriveners!handover_fees_payee_fk(name)
`;

type NameJoin = { name: string } | { name: string }[] | null;
type FeeRow = HandoverFee & { payer: NameJoin; payee: NameJoin };

async function getAuthedClient() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user };
}

/** Supabase JOIN 可能回傳物件或陣列，統一取姓名 */
function joinedName(join: NameJoin): string {
    const row = Array.isArray(join) ? join[0] : join;
    return row?.name ?? '';
}

function toFeeWithNames({ payer, payee, ...fee }: FeeRow): HandoverFeeWithNames {
    return { ...fee, payer_name: joinedName(payer), payee_name: joinedName(payee) };
}

/** `YYYY-MM` 的下個月第一天 */
function nextMonthStart(month: string): string {
    const [y, m] = month.split('-').map(Number);
    return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export async function createHandoverFee(input: CreateHandoverFeeInput): Promise<ActionResult> {
    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    const parsed = createHandoverFeeSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? '輸入資料錯誤' };

    // 付款人/收款人必須是本人名單中使用中的地政士（DB 複合外鍵只擋得住他人名單，擋不住已隱藏者）
    const partyIds = [parsed.data.payer_scrivener_id, parsed.data.payee_scrivener_id];
    const { data: parties, error: partyError } = await supabase
        .from('scriveners')
        .select('id')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .in('id', partyIds);
    if (partyError) return { success: false, error: partyError.message };
    if ((parties ?? []).length !== partyIds.length) {
        return { success: false, error: '付款人或收款人不在使用中的名單，請重新選擇' };
    }

    const { note, ...rest } = parsed.data;
    const { error } = await supabase
        .from('handover_fees')
        .insert({ user_id: user.id, ...rest, note: note || null, paid_at: null });
    if (error) return { success: false, error: error.message };

    revalidatePath('/cases');
    return { success: true };
}

export async function setHandoverFeePaid(id: string, paid: boolean): Promise<ActionResult> {
    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    const { data, error } = await supabase
        .from('handover_fees')
        .update({ paid_at: paid ? new Date().toISOString() : null })
        .eq('id', id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .select('id');
    if (error) return { success: false, error: error.message };
    if (!data?.length) return NOT_FOUND;

    revalidatePath('/cases');
    return { success: true };
}

/** 軟刪除：保留紀錄並寫入 deleted_at */
export async function deleteHandoverFee(id: string): Promise<ActionResult> {
    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    const { data, error } = await supabase
        .from('handover_fees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .select('id');
    if (error) return { success: false, error: error.message };
    if (!data?.length) return NOT_FOUND;

    revalidatePath('/cases');
    return { success: true };
}

/** 新增地政士；同名且已隱藏時改為還原，同名且使用中時拒絕 */
export async function addScrivener(rawName: string): Promise<ActionResult> {
    const parsedName = scrivenerNameSchema.safeParse(rawName);
    if (!parsedName.success) return { success: false, error: parsedName.error.issues[0]?.message ?? '姓名錯誤' };
    const name = parsedName.data;

    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    const { data: existing, error: lookupError } = await supabase
        .from('scriveners')
        .select('id, archived_at')
        .eq('user_id', user.id)
        .eq('name', name)
        .maybeSingle();
    if (lookupError) return { success: false, error: lookupError.message };

    if (existing) {
        if (!existing.archived_at) return { success: false, error: '已有同名地政士' };
        const { error } = await supabase
            .from('scriveners')
            .update({ archived_at: null })
            .eq('id', existing.id)
            .eq('user_id', user.id);
        if (error) return { success: false, error: error.message };
    } else {
        const { data: orders, error: orderError } = await supabase
            .from('scriveners')
            .select('sort_order')
            .eq('user_id', user.id)
            .order('sort_order', { ascending: false });
        if (orderError) return { success: false, error: orderError.message };

        const maxOrder = (orders as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1;
        const { error } = await supabase
            .from('scriveners')
            .insert({ user_id: user.id, name, sort_order: maxOrder + 1 });
        // 兩個分頁同時新增同名時，查詢後才撞到唯一索引
        if (error?.code === UNIQUE_VIOLATION) return { success: false, error: '已有同名地政士' };
        if (error) return { success: false, error: error.message };
    }

    revalidatePath('/cases');
    return { success: true };
}

/** 隱藏地政士：不再出現在選單，既有紀錄不變 */
export async function archiveScrivener(id: string): Promise<ActionResult> {
    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    const { data, error } = await supabase
        .from('scriveners')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id');
    if (error) return { success: false, error: error.message };
    if (!data?.length) return NOT_FOUND;

    revalidatePath('/cases');
    return { success: true };
}

/** 讀取完整名單（含已隱藏）；首次使用時先建立預設 7 人 */
export async function listScrivenersWithDefaults(): Promise<DataResult<Scrivener[]>> {
    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    const { error: rpcError } = await supabase.rpc('ensure_default_scriveners');
    if (rpcError) return { success: false, error: rpcError.message };

    const { data, error } = await supabase
        .from('scriveners')
        .select('id, name, sort_order, archived_at')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []) as Scrivener[] };
}

/** 未收款：未收且未刪除，日期由舊到新 */
export async function listUnpaidFees(): Promise<DataResult<HandoverFeeWithNames[]>> {
    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    const { data, error } = await supabase
        .from('handover_fees')
        .select(FEE_SELECT)
        .eq('user_id', user.id)
        .is('paid_at', null)
        .is('deleted_at', null)
        .order('fee_date', { ascending: true });
    if (error) return { success: false, error: error.message };

    return { success: true, data: ((data ?? []) as unknown as FeeRow[]).map(toFeeWithNames) };
}

/** 歷史：指定月份、未刪除；有指定地政士時比對付款人或收款人；日期由新到舊 */
export async function listFeeHistory(params: {
    month: string;
    scrivenerId?: string;
}): Promise<DataResult<HandoverFeeWithNames[]>> {
    const { month, scrivenerId } = params;
    if (!MONTH_RE.test(month)) return { success: false, error: '月份格式錯誤' };
    if (scrivenerId && !UUID_RE.test(scrivenerId)) return { success: false, error: '地政士參數錯誤' };

    const { supabase, user } = await getAuthedClient();
    if (!user) return UNAUTHORIZED;

    let query = supabase
        .from('handover_fees')
        .select(FEE_SELECT)
        .eq('user_id', user.id)
        .gte('fee_date', `${month}-01`)
        .lt('fee_date', nextMonthStart(month))
        .is('deleted_at', null);
    if (scrivenerId) {
        query = query.or(`payer_scrivener_id.eq.${scrivenerId},payee_scrivener_id.eq.${scrivenerId}`);
    }

    const { data, error } = await query.order('fee_date', { ascending: false });
    if (error) return { success: false, error: error.message };

    return { success: true, data: ((data ?? []) as unknown as FeeRow[]).map(toFeeWithNames) };
}
