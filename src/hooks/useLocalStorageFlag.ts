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

function readFlag(key: string, defaultValue: boolean): boolean {
    const raw = localStorage.getItem(key);
    return raw === null ? defaultValue : raw === 'true';
}

/**
 * 以 localStorage 持久化的布林旗標（`"true"` / `"false"`，未設定時用 defaultValue）。
 *
 * 用 useSyncExternalStore 而非 useState lazy initializer：
 * SSR 與 hydration 階段回 serverValue，hydration 完成後才讀 localStorage，
 * 避免 hydration mismatch 讓伺服器 HTML 蓋掉已存的狀態。
 *
 * @param serverValue SSR 時的值，預設同 defaultValue；需要「SSR 先隱藏」時另外指定。
 */
export function useLocalStorageFlag(
    key: string,
    defaultValue = false,
    serverValue = defaultValue
): [boolean, () => void, (value: boolean) => void] {
    const value = useSyncExternalStore(
        subscribe,
        () => readFlag(key, defaultValue),
        () => serverValue
    );

    const set = useCallback(
        (next: boolean) => {
            localStorage.setItem(key, String(next));
            listeners.forEach((l) => l());
        },
        [key]
    );

    const toggle = useCallback(() => set(!readFlag(key, defaultValue)), [set, key, defaultValue]);

    return [value, toggle, set];
}
