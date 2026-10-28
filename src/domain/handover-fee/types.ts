import { z } from 'zod';

/** 地政士名單（scriveners 表） */
export interface Scrivener {
    id: string;
    name: string;
    sort_order: number;
    archived_at: string | null;
}

/** 遞牌費紀錄（handover_fees 表）；paid_at 非 null 即為已收 */
export interface HandoverFee {
    id: string;
    fee_date: string;
    object_number: string;
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

export const createHandoverFeeSchema = z
    .object({
        fee_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤'),
        object_number: z.string().trim().min(1, '請輸入物件編號'),
        payer_scrivener_id: z.string().min(1, '請選擇付款人'),
        payee_scrivener_id: z.string().min(1, '請選擇收款人'),
        amount: z.number('金額必須是正整數').int('金額必須是正整數').positive('金額必須是正整數'),
        note: z.string().trim().optional(),
    })
    .refine((v) => v.payer_scrivener_id !== v.payee_scrivener_id, {
        message: '付款人與收款人不可相同',
        path: ['payee_scrivener_id'],
    });

export type CreateHandoverFeeInput = z.input<typeof createHandoverFeeSchema>;

export const scrivenerNameSchema = z.string().trim().min(1, '請輸入地政士姓名');
