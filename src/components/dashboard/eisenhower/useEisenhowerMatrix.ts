'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useNotification } from '@/hooks/useNotification';
import { getEisenhowerMatrix, saveEisenhowerMatrix } from '@/app/actions/eisenhowerActions';
import { CASE_STATUS_CLOSED, CASE_STATUS_CANCELLED } from '@/lib/constants/caseConstants';
import { deriveChips, parseMatrix, prunePlacements, zoneDisplayLabel, type ChipSourceCase } from './chipUtils';
import {
    MAX_ZONES,
    MIN_ZONES,
    NEW_ZONE_LABEL,
    type EisenhowerMatrixData,
    type PersonChipData,
} from './types';

const SAVE_DEBOUNCE_MS = 800;

/**
 * 艾森豪矩陣狀態：聚合未結案案件名片、載入/保存個人分類與自訂象限（2–8 格）。
 * 拖放與行動選單共用 moveChip 這一條 state 更新路徑。
 */
export function useEisenhowerMatrix() {
    const supabase = useMemo(() => createClient(), []);
    const notify = useNotification();
    const notifyRef = useRef(notify);
    notifyRef.current = notify;

    const [chips, setChips] = useState<PersonChipData[]>([]);
    const [matrix, setMatrix] = useState<EisenhowerMatrixData>(() => parseMatrix(null));
    const [loading, setLoading] = useState(true);

    const matrixRef = useRef(matrix);
    matrixRef.current = matrix;
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const { data, error } = await supabase
                    .from('cases')
                    .select('id, case_number, buyer_name, seller_name, status')
                    .neq('status', CASE_STATUS_CLOSED)
                    .neq('status', CASE_STATUS_CANCELLED);
                if (error) throw error;

                const derived = deriveChips((data ?? []) as ChipSourceCase[]);
                if (cancelled) return;
                setChips(derived);

                // 設定讀取失敗時：全部名片留在待分類，不阻斷區塊
                let saved: EisenhowerMatrixData = parseMatrix(null);
                try {
                    saved = await getEisenhowerMatrix();
                } catch (err) {
                    notifyRef.current.error('載入矩陣設定失敗', err);
                }
                if (cancelled) return;

                const chipKeys = new Set(derived.map((c) => c.key));
                const zoneIds = new Set(saved.zones.map((z) => z.id));
                setMatrix({
                    zones: saved.zones,
                    placements: prunePlacements(saved.placements, chipKeys, zoneIds),
                });
            } catch (err) {
                if (!cancelled) notifyRef.current.error('載入案件名片失敗', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [supabase]);

    /** 防抖保存目前矩陣；失敗顯示錯誤、樂觀狀態不回滾 */
    const scheduleSave = useCallback(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            try {
                const result = await saveEisenhowerMatrix(matrixRef.current);
                if (!result.success) {
                    notifyRef.current.error('保存矩陣失敗', result.error);
                }
            } catch (err) {
                notifyRef.current.error('保存矩陣失敗', err);
            }
        }, SAVE_DEBOUNCE_MS);
    }, []);

    /** 以 updater 改寫單一名片的歸屬清單（空清單 = 移出 placements，回待分類） */
    const updateMemberships = useCallback(
        (chipKey: string, updater: (current: string[]) => string[]) => {
            setMatrix((prev) => {
                const next = updater(prev.placements[chipKey] ?? []);
                const placements = { ...prev.placements };
                if (next.length) placements[chipKey] = next;
                else delete placements[chipKey];
                return { ...prev, placements };
            });
            scheduleSave();
        },
        [scheduleSave]
    );

    /** 拖曳搬家：自來源格移出、加入目標格；to 為 null（拖回待分類）僅移出來源格 */
    const moveChip = useCallback(
        (chipKey: string, fromZoneId: string | null, toZoneId: string | null) => {
            updateMemberships(chipKey, (current) => {
                const next = fromZoneId ? current.filter((z) => z !== fromZoneId) : [...current];
                if (toZoneId && !next.includes(toZoneId)) next.push(toZoneId);
                return next;
            });
        },
        [updateMemberships]
    );

    /** 選單勾選 / 格內 ✕ 共用：切換名片在某格的歸屬 */
    const toggleZone = useCallback(
        (chipKey: string, zoneId: string) => {
            updateMemberships(chipKey, (current) =>
                current.includes(zoneId) ? current.filter((z) => z !== zoneId) : [...current, zoneId]
            );
        },
        [updateMemberships]
    );

    /** 移回待分類：清空全部歸屬 */
    const clearZones = useCallback(
        (chipKey: string) => updateMemberships(chipKey, () => []),
        [updateMemberships]
    );

    /** 編輯象限標題：空字串回 fallback（q1–q4 預設詞、自訂象限「新象限」） */
    const renameZone = useCallback(
        (zoneId: string, title: string) => {
            setMatrix((prev) => ({
                ...prev,
                zones: prev.zones.map((z) =>
                    z.id === zoneId ? { ...z, label: title.trim() || zoneDisplayLabel({ id: z.id, label: '' }) } : z
                ),
            }));
            scheduleSave();
        },
        [scheduleSave]
    );

    /** 拖曳排序象限卡片：把 draggedId 所在項目搬到 targetId 的位置，僅改順序不動歸屬 */
    const reorderZone = useCallback(
        (draggedId: string, targetId: string) => {
            if (draggedId === targetId) return;
            setMatrix((prev) => {
                const fromIndex = prev.zones.findIndex((z) => z.id === draggedId);
                const toIndex = prev.zones.findIndex((z) => z.id === targetId);
                if (fromIndex < 0 || toIndex < 0) return prev;
                const zones = [...prev.zones];
                const [moved] = zones.splice(fromIndex, 1);
                zones.splice(toIndex, 0, moved);
                return { ...prev, zones };
            });
            scheduleSave();
        },
        [scheduleSave]
    );

    /** 新增象限（達 MAX_ZONES 拒絕） */
    const addZone = useCallback(() => {
        setMatrix((prev) => {
            if (prev.zones.length >= MAX_ZONES) return prev;
            return {
                ...prev,
                zones: [...prev.zones, { id: `z${Date.now()}${prev.zones.length}`, label: NEW_ZONE_LABEL }],
            };
        });
        scheduleSave();
    }, [scheduleSave]);

    /** 刪除象限（剩 MIN_ZONES 拒絕）：該格名片退回待分類（僅移除該格歸屬） */
    const removeZone = useCallback(
        (zoneId: string) => {
            setMatrix((prev) => {
                if (prev.zones.length <= MIN_ZONES) return prev;
                const placements: Record<string, string[]> = {};
                for (const [key, list] of Object.entries(prev.placements)) {
                    const kept = list.filter((z) => z !== zoneId);
                    if (kept.length) placements[key] = kept;
                }
                return { zones: prev.zones.filter((z) => z.id !== zoneId), placements };
            });
            scheduleSave();
        },
        [scheduleSave]
    );

    const unclassifiedChips = chips.filter((c) => !matrix.placements[c.key]?.length);
    const chipsInZone = useCallback(
        (zoneId: string) => chips.filter((c) => matrix.placements[c.key]?.includes(zoneId)),
        [chips, matrix.placements]
    );

    return {
        chips,
        matrix,
        loading,
        unclassifiedChips,
        chipsInZone,
        moveChip,
        toggleZone,
        clearZones,
        renameZone,
        reorderZone,
        addZone,
        removeZone,
    };
}
