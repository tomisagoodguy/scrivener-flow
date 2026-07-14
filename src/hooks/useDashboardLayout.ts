'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboardLayout, updateDashboardLayout } from '@/app/actions/dashboardLayout';
import { DEFAULT_DASHBOARD_LAYOUT, type DashboardLayout, type DashboardWidgetId } from '@/domain/dashboard/layoutTypes';
import { useNotification } from '@/hooks/useNotification';

interface UseDashboardLayoutResult {
    layout: DashboardLayout;
    isLoading: boolean;
    hideWidget: (id: DashboardWidgetId) => void;
    showWidget: (id: DashboardWidgetId) => void;
    reorderWidgets: (newOrder: DashboardWidgetId[]) => void;
}

/** 依新的可見區塊順序重新指派 order（0..n-1），隱藏區塊維持原 order 不變 */
function applyReorder(prev: DashboardLayout, newOrder: DashboardWidgetId[]): DashboardLayout {
    const reordered = newOrder
        .map((id) => prev.find((w) => w.id === id))
        .filter((w): w is DashboardLayout[number] => w !== undefined)
        .map((w, i) => ({ ...w, order: i }));

    const untouched = prev.filter((w) => !newOrder.includes(w.id));
    return [...reordered, ...untouched];
}

/** 使用者的儀表板版面設定（顯示/隱藏/排序），含樂觀更新與失敗回滾 */
export function useDashboardLayout(): UseDashboardLayoutResult {
    const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT);
    const [isLoading, setIsLoading] = useState(true);
    const notify = useNotification();
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    useEffect(() => {
        let cancelled = false;
        getDashboardLayout().then((result) => {
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
        (updater: (prev: DashboardLayout) => DashboardLayout) => {
            const previous = layoutRef.current;
            const next = updater(previous);
            setLayout(next);

            updateDashboardLayout(next).then((result) => {
                if (!result.success) {
                    setLayout(previous);
                    notify.error('儲存版面設定失敗，請重試', result.error);
                }
            });
        },
        [notify]
    );

    const hideWidget = useCallback(
        (id: DashboardWidgetId) => {
            applyChange((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)));
        },
        [applyChange]
    );

    const showWidget = useCallback(
        (id: DashboardWidgetId) => {
            applyChange((prev) => {
                const maxOrder = prev.reduce((max, w) => Math.max(max, w.order), -1);
                return prev.map((w) => (w.id === id ? { ...w, visible: true, order: maxOrder + 1 } : w));
            });
        },
        [applyChange]
    );

    const reorderWidgets = useCallback(
        (newOrder: DashboardWidgetId[]) => {
            applyChange((prev) => applyReorder(prev, newOrder));
        },
        [applyChange]
    );

    return { layout, isLoading, hideWidget, showWidget, reorderWidgets };
}
