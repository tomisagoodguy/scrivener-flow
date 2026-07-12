import { CASE_INACTIVE_STATUSES } from '@/lib/constants/caseConstants';
import {
    DEFAULT_ZONES,
    MAX_ZONES,
    MIN_ZONES,
    NEW_ZONE_LABEL,
    type EisenhowerMatrixData,
    type EisenhowerZone,
    type PersonChipData,
} from './types';

/** deriveChips 只需要案件的這幾個欄位（結構型別，測試與 hook 共用） */
export interface ChipSourceCase {
    id: string;
    case_number: string;
    buyer_name: string | null;
    seller_name: string | null;
    status: string;
}

/**
 * 把未結案案件展開成名片清單（一案一卡）：
 * 至少一方姓名非空才產卡，識別鍵為 case_id，卡面並列買賣雙方姓名。
 */
export function deriveChips(cases: ChipSourceCase[]): PersonChipData[] {
    const chips: PersonChipData[] = [];
    for (const c of cases) {
        if ((CASE_INACTIVE_STATUSES as string[]).includes(c.status)) continue;
        const buyerName = c.buyer_name?.trim() || null;
        const sellerName = c.seller_name?.trim() || null;
        if (!buyerName && !sellerName) continue;
        chips.push({ key: c.id, caseId: c.id, caseNumber: c.case_number, buyerName, sellerName });
    }
    return chips;
}

/**
 * 失效清理：只保留「名片鍵仍存在」的項目，陣列內過濾至現存 zone id，
 * 歸屬清空的項目整個刪除。回傳新物件，不改動輸入。
 */
export function prunePlacements(
    placements: Record<string, string[]>,
    chipKeys: ReadonlySet<string>,
    zoneIds: ReadonlySet<string>
): Record<string, string[]> {
    const pruned: Record<string, string[]> = {};
    for (const [key, list] of Object.entries(placements)) {
        if (!chipKeys.has(key)) continue;
        const kept = list.filter((zoneId) => zoneIds.has(zoneId));
        if (kept.length) pruned[key] = kept;
    }
    return pruned;
}

/** 象限卡片拖曳排序用的 dataTransfer type（與名片拖曳的 text/plain 區隔，互不干擾） */
export const ZONE_DRAG_TYPE = 'application/x-eisenhower-zone';

/** 拖曳 payload：名片鍵 + 來源格 id（待分類為空字串）。case id 為 uuid，不含 '|' */
export function encodeDragPayload(chipKey: string, fromZoneId: string | null): string {
    return `${chipKey}|${fromZoneId ?? ''}`;
}

export function decodeDragPayload(payload: string): { chipKey: string; fromZoneId: string | null } | null {
    const sep = payload.indexOf('|');
    if (sep < 0) return null;
    const chipKey = payload.slice(0, sep);
    if (!chipKey) return null;
    return { chipKey, fromZoneId: payload.slice(sep + 1) || null };
}

/** 象限顯示標題：標題空白時 q1–q4 回艾森豪預設詞、自訂象限回「新象限」 */
export function zoneDisplayLabel(zone: EisenhowerZone): string {
    const label = zone.label.trim();
    if (label) return label;
    return DEFAULT_ZONES.find((z) => z.id === zone.id)?.label ?? NEW_ZONE_LABEL;
}

/**
 * 把 DB 的 JSONB 內容淨化為合法的 EisenhowerMatrixData（v2）。
 * 舊格式相容：無 `zones` 的 v1 文件（{ placements, labels }）解讀為
 * 預設四象限並套用 labels 內已存的自訂標題。
 */
export function parseMatrix(raw: unknown): EisenhowerMatrixData {
    const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    let zones: EisenhowerZone[];
    if (Array.isArray(obj.zones)) {
        const seen = new Set<string>();
        zones = [];
        for (const entry of obj.zones as unknown[]) {
            if (typeof entry !== 'object' || entry === null) continue;
            const { id, label } = entry as Record<string, unknown>;
            if (typeof id !== 'string' || !id.trim() || seen.has(id)) continue;
            seen.add(id);
            zones.push({ id, label: typeof label === 'string' ? label : '' });
        }
        zones = zones.slice(0, MAX_ZONES);
        if (zones.length < MIN_ZONES) zones = [...DEFAULT_ZONES];
    } else {
        // v1 舊格式：預設四象限 + 套用 labels 自訂標題
        const legacyLabels =
            typeof obj.labels === 'object' && obj.labels !== null
                ? (obj.labels as Record<string, unknown>)
                : {};
        zones = DEFAULT_ZONES.map((z) => {
            const custom = legacyLabels[z.id];
            return typeof custom === 'string' && custom.trim() ? { id: z.id, label: custom } : { ...z };
        });
    }

    const zoneIds = new Set(zones.map((z) => z.id));
    const placements: Record<string, string[]> = {};
    if (typeof obj.placements === 'object' && obj.placements !== null) {
        for (const [key, value] of Object.entries(obj.placements as Record<string, unknown>)) {
            // v2 相容：字串值視為單元素陣列
            const rawList = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
            const kept: string[] = [];
            for (const zoneId of rawList) {
                if (typeof zoneId === 'string' && zoneIds.has(zoneId) && !kept.includes(zoneId)) kept.push(zoneId);
            }
            if (kept.length) placements[key] = kept;
        }
    }

    return { zones, placements };
}
