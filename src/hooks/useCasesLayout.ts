'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCasesLayout, updateCasesLayout } from '@/app/actions/casesLayout';
import { DEFAULT_CASES_LAYOUT, type CasesLayout, type CasesWidgetId } from '@/domain/cases/layoutTypes';
import { useNotification } from '@/hooks/useNotification';

interface UseCasesLayoutResult {
    layout: CasesLayout;
    isLoading: boolean;
    hideWidget: (id: CasesWidgetId) => void;
    showWidget: (id: CasesWidgetId) => void;
    reorderWidgets: (newOrder: CasesWidgetId[]) => void;
}

/** 依新的可見板塊順序重新指派 order（0..n-1），隱藏板塊維持原 order 不變 */
function applyReorder(prev: CasesLayout, newOrder: CasesWidgetId[]): CasesLayout {
    const reordered = newOrder
        .map((id) => prev.find((w) => w.id === id))
        .filter((w): w is CasesLayout[number] => w !== undefined)
        .map((w, i) => ({ ...w, order: i }));

    const untouched = prev.filter((w) => !newOrder.includes(w.id));
    return [...reordered, ...untouched];
}

/** `/cases` 頁面板塊版面設定（顯示/隱藏/排序），含樂觀更新與失敗回滾 */
export function useCasesLayout(): UseCasesLayoutResult {
    const [layout, setLayout] = useState<CasesLayout>(DEFAULT_CASES_LAYOUT);
    const [isLoading, setIsLoading] = useState(true);
    const notify = useNotification();
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    useEffect(() => {
        let cancelled = false;
        getCasesLayout().then((result) => {
            if (!cancelled) {
                setLayout(result);
                setIsLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const applyChange = useCallback(
        (updater: (prev: CasesLayout) => CasesLayout) => {
            const previous = layoutRef.current;
            const next = updater(previous);
            setLayout(next);

            updateCasesLayout(next).then((result) => {
                if (!result.success) {
                    setLayout(previous);
                    notify.error('儲存版面設定失敗，請重試', result.error);
                }
            });
        },
        [notify]
    );

    const hideWidget = useCallback(
        (id: CasesWidgetId) => {
            applyChange((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)));
        },
        [applyChange]
    );

    const showWidget = useCallback(
        (id: CasesWidgetId) => {
            applyChange((prev) => {
                const maxOrder = prev.reduce((max, w) => Math.max(max, w.order), -1);
                return prev.map((w) => (w.id === id ? { ...w, visible: true, order: maxOrder + 1 } : w));
            });
        },
        [applyChange]
    );

    const reorderWidgets = useCallback(
        (newOrder: CasesWidgetId[]) => {
            applyChange((prev) => applyReorder(prev, newOrder));
        },
        [applyChange]
    );

    return { layout, isLoading, hideWidget, showWidget, reorderWidgets };
}
