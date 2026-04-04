/**
 * 案件業務邏輯常數
 * 注意：DB 儲存值必須與此完全一致
 */
import type { CaseStatus } from '@/types';

/** 進行中案件的 DB 狀態值（API 篩選使用） */
export const CASE_STATUS_ACTIVE: CaseStatus = 'Processing';

/** 結案案件的 DB 狀態值 */
export const CASE_STATUS_CLOSED: CaseStatus = 'Closed';

/** 解約案件的 DB 狀態值 */
export const CASE_STATUS_CANCELLED: CaseStatus = 'Cancelled';

/** 不顯示在進行中清單的終結狀態 */
export const CASE_INACTIVE_STATUSES: CaseStatus[] = ['Closed', 'Cancelled'];

/** 待辦事項來源類型 */
export const TODO_SOURCE_TYPES = {
    MANUAL: 'manual',
    SYSTEM: 'system',
} as const;

export type TodoSourceType = typeof TODO_SOURCE_TYPES[keyof typeof TODO_SOURCE_TYPES];

/** 代償流程 7 個固定步驟 */
export const REDEMPTION_STEPS = [
    { step_number: 1, label: '確認原貸款餘額' },
    { step_number: 2, label: '申請代償撥款（買方銀行）' },
    { step_number: 3, label: '確認撥款日' },
    { step_number: 4, label: '原貸款銀行確認收款' },
    { step_number: 5, label: '申請塗銷抵押設定' },
    { step_number: 6, label: '等塗銷完成' },
    { step_number: 7, label: '確認土地建物謄本乾淨' },
] as const;
