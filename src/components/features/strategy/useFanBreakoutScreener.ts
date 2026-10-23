'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    DEFAULT_FAN_BREAKOUT_FILTERS,
    FAN_BREAKOUT_PAGE_SIZE,
    filterRows,
    paginate,
    type FanBreakoutFilters,
    type FanBreakoutRow,
    type Page,
} from '@/lib/investment/fanBreakout';

const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

interface UseFanBreakoutScreener {
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

    const filtered = useMemo(() => filterRows(rows, filters), [rows, filters]);
    const selectedIndex = Math.min(rawIndex, Math.max(0, filtered.length - 1));
    const pageInfo = useMemo(() => paginate(filtered, page, FAN_BREAKOUT_PAGE_SIZE), [filtered, page]);
    const selectedRow = filtered[selectedIndex] ?? null;

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

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            const target = e.target;
            if (target instanceof HTMLElement && FORM_TAGS.has(target.tagName)) return;
            move(e.key === 'ArrowRight' ? 1 : -1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [move]);

    return {
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
