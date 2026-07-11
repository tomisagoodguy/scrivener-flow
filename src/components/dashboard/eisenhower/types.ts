/**
 * 艾森豪矩陣 — 單一事實來源型別（v2：使用者自管象限）
 * 對應 user_settings.eisenhower_matrix JSONB 欄位
 */

export interface EisenhowerZone {
    /** 穩定識別鍵：預設四格為 q1–q4，自訂象限為 z{timestamp} */
    id: string;
    label: string;
}

export interface EisenhowerMatrixData {
    /** 使用者自訂象限清單（2–8 格） */
    zones: EisenhowerZone[];
    /** 名片識別鍵（case_id）→ 所屬 zone id 陣列（去重、無空陣列項；一卡可屬多格） */
    placements: Record<string, string[]>;
}

export const MIN_ZONES = 2;
export const MAX_ZONES = 8;

/** 自訂象限的預設標題（清空標題時的 fallback） */
export const NEW_ZONE_LABEL = '新象限';

export const DEFAULT_ZONES: EisenhowerZone[] = [
    { id: 'q1', label: '重要且緊急' },
    { id: 'q2', label: '重要不緊急' },
    { id: 'q3', label: '緊急不重要' },
    { id: 'q4', label: '不重要不緊急' },
];

export interface PersonChipData {
    /** 穩定識別鍵：case_id（一案一卡） */
    key: string;
    caseId: string;
    /** 案號僅供 hover tooltip，不顯示於卡面 */
    caseNumber: string;
    buyerName: string | null;
    sellerName: string | null;
}
