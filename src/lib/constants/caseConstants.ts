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
