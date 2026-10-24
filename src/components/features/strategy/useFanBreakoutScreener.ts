'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    DEFAULT_FAN_BREAKOUT_FILTERS,
    FAN_BREAKOUT_PAGE_SIZE,
    filterRows,
    latestRowPerStock,
    paginate,
    type FanBreakoutFilters,
    type FanBreakoutRow,
    type Page,
} from '@/lib/investment/fanBreakout';

const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

export type FanBreakoutViewMode = 'table' | 'continuous';

interface UseFanBreakoutScreener {
    viewMode: FanBreakoutViewMode;
    setViewMode: (mode: FanBreakoutViewMode) => void;
    /** 連續看圖清單：篩選後每股只留最新訊號列 */
    continuousRows: FanBreakoutRow[];
    /** 目前選取列的股票在 continuousRows 的索引；找不到為 0 */
    continuousInitialIndex: number;
    filters: FanBreakoutFilters;
    updateFilters: (patch: Partial<FanBreakoutFilters>) => void;
    pageInfo: Page<FanBreakoutRow>;
    /** pageInfo.items[0] 在篩選後清單中的索引 */
    pageStartIndex: number;
    setPage: (page: number) => void;
    /** 選取列在篩選後清單中的索引 */
    selectedIndex: number;
    selectedRow: FanBreakoutRow | null;
    select: (index: number) => void;
    move: (delta: number) => void;
}

/** 候選頁的篩選、分頁、選取狀態與方向鍵導覽。 */
export function useFanBreakoutScreener(rows: FanBreakoutRow[]): UseFanBreakoutScreener {
    const [filters, setFilters] = useState<FanBreakoutFilters>(DEFAULT_FAN_BREAKOUT_FILTERS);
    const [page, setPage] = useState(1);
    const [rawIndex, setRawIndex] = useState(0);
    const [viewMode, setViewMode] = useState<FanBreakoutViewMode>('table');

    const filtered = useMemo(() => filterRows(rows, filters), [rows, filters]);
    const selectedIndex = Math.min(rawIndex, Math.max(0, filtered.length - 1));
    const pageInfo = useMemo(() => paginate(filtered, page, FAN_BREAKOUT_PAGE_SIZE), [filtered, page]);
    const selectedRow = filtered[selectedIndex] ?? null;
    const continuousRows = useMemo(() => latestRowPerStock(filtered), [filtered]);
    const continuousInitialIndex = Math.max(
        0,
        continuousRows.findIndex((r) => r.stockId === selectedRow?.stockId),
    );

    const updateFilters = useCallback((patch: Partial<FanBreakoutFilters>) => {
        setFilters((prev) => ({ ...prev, ...patch }));
        setPage(1);
        setRawIndex(0);
    }, []);

    const select = useCallback((index: number) => setRawIndex(index), []);

    const move = useCallback(
        (delta: number) => {
            if (filtered.length === 0) return;
            const next = Math.min(Math.max(selectedIndex + delta, 0), filtered.length - 1);
            setRawIndex(next);
            setPage(Math.floor(next / FAN_BREAKOUT_PAGE_SIZE) + 1);
        },
        [filtered.length, selectedIndex],
    );

    // ←/→ 只在表格模式切換選取列；連續看圖模式不在背景改動選取
    useEffect(() => {
        if (viewMode !== 'table') return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            const target = e.target;
            if (target instanceof HTMLElement && FORM_TAGS.has(target.tagName)) return;
            move(e.key === 'ArrowRight' ? 1 : -1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [move, viewMode]);

    return {
        viewMode,
        setViewMode,
        continuousRows,
        continuousInitialIndex,
        filters,
        updateFilters,
        pageInfo,
        pageStartIndex: (pageInfo.page - 1) * FAN_BREAKOUT_PAGE_SIZE,
        setPage,
        selectedIndex,
        selectedRow,
        select,
        move,
    };
}
