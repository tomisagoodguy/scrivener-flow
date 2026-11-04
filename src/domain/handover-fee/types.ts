import { z } from 'zod';

/** 地政士名單（scriveners 表） */
export interface Scrivener {
    id: string;
    name: string;
    sort_order: number;
    archived_at: string | null;
}

/** 互遞紀錄（handover_fees 表 entry_type = exchange）；paid_at 非 null 即為已收 */
export interface HandoverFee {
    id: string;
    entry_type: 'exchange';
    fee_date: string;
    object_number: string | null;
    payer_scrivener_id: string;
    payee_scrivener_id: string;
    amount: number;
    paid_at: string | null;
    note: string | null;
}

/** 帶出付款人/收款人姓名的紀錄（已隱藏的地政士仍顯示姓名） */
export interface HandoverFeeWithNames extends HandoverFee {
    payer_name: string;
    payee_name: string;
}

/** 自己遞牌紀錄（entry_type = solo）：沒有付款人/收款人，也沒有收款狀態 */
export interface SoloHandoverFee {
    id: string;
    entry_type: 'solo';
    fee_date: string;
    object_number: string | null;
    case_count: number;
    amount: number | null;
    note: string | null;
}

/** 歷史清單的一列，以 entry_type 判別 */
export type LedgerEntry = HandoverFeeWithNames | SoloHandoverFee;

/** 上限遠低於 Postgres integer（2147483647），避免溢位錯誤原文外露 */
const MAX_AMOUNT = 99_999_999;
/** 防手誤的上限 */
const MAX_CASE_COUNT = 9999;

/** `YYYY-MM-DD` 是否為真實存在的日期（排除 2026-02-30、2026-13-45） */
function isRealDate(value: string): boolean {
    const time = Date.parse(`${value}T00:00:00Z`);
    return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

const feeDateField = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤')
    .refine((v) => isRealDate(v), '日期格式錯誤');
// 選填：trim 後空字串存成 null（DB 約束只允許 null 或非空白）
const objectNumberField = z
    .string()
    .optional()
    .transform((v) => v?.trim() || null);
const amountField = z
    .number('金額必須是正整數')
    .int('金額必須是正整數')
    .positive('金額必須是正整數')
    .max(MAX_AMOUNT, '金額過大');
const noteField = z.string().trim().optional();

export const createHandoverFeeSchema = z
    .object({
        fee_date: feeDateField,
        object_number: objectNumberField,
        payer_scrivener_id: z.string().min(1, '請選擇付款人').uuid('付款人資料錯誤'),
        payee_scrivener_id: z.string().min(1, '請選擇收款人').uuid('收款人資料錯誤'),
        amount: amountField,
        note: noteField,
    })
    .refine((v) => v.payer_scrivener_id !== v.payee_scrivener_id, {
        message: '付款人與收款人不可相同',
        path: ['payee_scrivener_id'],
    });

export type CreateHandoverFeeInput = z.input<typeof createHandoverFeeSchema>;

export const createSoloFeeSchema = z.object({
    fee_date: feeDateField,
    object_number: objectNumberField,
    case_count: z
        .number('件數必須是正整數')
        .int('件數必須是正整數')
        .positive('件數必須是正整數')
        .max(MAX_CASE_COUNT, '件數必須是正整數'),
    amount: amountField.nullable(),
    note: noteField,
});

export type CreateSoloFeeInput = z.input<typeof createSoloFeeSchema>;

export const scrivenerNameSchema = z.string().trim().min(1, '請輸入地政士姓名');
