'use client';

import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
    listeners.add(callback);
    window.addEventListener('storage', callback);
    return () => {
        listeners.delete(callback);
        window.removeEventListener('storage', callback);
    };
}

/**
 * 以 localStorage 持久化的布林旗標（值為 `"true"` 視為 true）。
 *
 * 用 useSyncExternalStore 而非 useState lazy initializer：
 * SSR 階段固定回 false，hydration 完成後才讀 localStorage，
 * 避免 hydration mismatch 讓伺服器 HTML 蓋掉已存的狀態。
 */
export function useLocalStorageFlag(key: string): [boolean, () => void] {
    const value = useSyncExternalStore(
        subscribe,
        () => localStorage.getItem(key) === 'true',
        () => false
    );

    const toggle = useCallback(() => {
        const next = localStorage.getItem(key) !== 'true';
        localStorage.setItem(key, String(next));
        listeners.forEach((l) => l());
    }, [key]);

    return [value, toggle];
}
