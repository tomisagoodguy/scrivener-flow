'use client';

import { useState } from 'react';

export interface BlinkBadgeState {
    displayCount: number;
    isBlinking: boolean;
}

// 已讀事件會把 isBlinking 設為 false，因此這裡用 !prev.isBlinking（而非數值比較）
// 判斷「是否為已讀後的新未讀」，避免新未讀數字剛好等於凍結值時被誤判為無變化。
export function nextBlinkBadgeState(prev: BlinkBadgeState, unread: number): BlinkBadgeState {
    if (unread > 0) {
        if (!prev.isBlinking || unread !== prev.displayCount) {
            return { displayCount: unread, isBlinking: true };
        }
        return prev;
    }
    if (prev.isBlinking) {
        return { displayCount: prev.displayCount, isBlinking: false };
    }
    return prev;
}

export function useBlinkingBadge(unread: number): BlinkBadgeState {
    const [prevUnread, setPrevUnread] = useState(unread);
    const [state, setState] = useState<BlinkBadgeState>({ displayCount: unread, isBlinking: unread > 0 });

    // React 官方建議的「render 期間依 props 調整 state」寫法，取代 useEffect + setState，
    // 避免 react-hooks/set-state-in-effect 警告的連鎖重render問題。
    if (unread !== prevUnread) {
        setPrevUnread(unread);
        setState((prev) => nextBlinkBadgeState(prev, unread));
    }

    return state;
}
