'use client';

import { useCallback, useRef, useState } from 'react';
import type { WeightHistoryRow } from '@/app/investment/history/page';

interface OnDemandState {
    code: string;
    rows: WeightHistoryRow[];
    loading: boolean;
    error: string | null;
}

const INITIAL: OnDemandState = { code: '', rows: [], loading: false, error: null };

/**
 * 依選擇按需載入 90 天持股比重歷史（`/investment/history` 頁籤用）。
 *
 * - 已載入的代碼暫存，切回不重抓；同一代碼進行中的請求共用，不重複發送。
 * - 只採用最新一次選擇的回應（遞增序號），過期回應一律丟棄。
 * - 失敗時顯示錯誤並移出暫存，重選同一代碼即重試。
 */
export function useOnDemandWeightHistory(loader: (code: string) => Promise<WeightHistoryRow[]>) {
    const loaded = useRef(new Map<string, WeightHistoryRow[]>());
    const inFlight = useRef(new Map<string, Promise<WeightHistoryRow[]>>());
    const selected = useRef('');
    const seq = useRef(0);
    const [state, setState] = useState<OnDemandState>(INITIAL);

    const select = useCallback((code: string) => {
        if (!code || code === selected.current) return;
        selected.current = code;
        const id = ++seq.current;

        const hit = loaded.current.get(code);
        if (hit) {
            setState({ code, rows: hit, loading: false, error: null });
            return;
        }

        let pending = inFlight.current.get(code);
        if (!pending) {
            pending = loader(code);
            inFlight.current.set(code, pending);
            pending.then(
                rows => loaded.current.set(code, rows),
                () => undefined, // 錯誤由下方依序號處理；這裡只負責暫存
            ).finally(() => inFlight.current.delete(code));
        }

        setState({ code, rows: [], loading: true, error: null });
        pending.then(
            rows => {
                if (seq.current === id) setState({ code, rows, loading: false, error: null });
            },
            (err: unknown) => {
                if (seq.current !== id) return;
                setState({ code, rows: [], loading: false, error: err instanceof Error ? err.message : String(err) });
                selected.current = ''; // 允許重選同一代碼重試
            },
        );
    }, [loader]);

    return { ...state, select };
}
