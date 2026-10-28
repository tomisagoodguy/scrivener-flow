'use client';

import { useEffect, useRef, useState } from 'react';
import { BareKSlideContent } from '@/components/features/investment/BareKSlideContent';
import { getStrategySnapshots } from '@/app/actions/getStrategySnapshots';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

interface Props {
    code: string;
    name: string;
    /** 持有此股的 ETF 代號，當作圖表標籤 */
    strategies: string[];
}

type LoadState =
    | { status: 'loading' }
    | { status: 'ready'; snapshot: BareKSnapshot | null }
    | { status: 'error' };

/** 段落需連續停留在視窗內多久才抓快照 */
export const DWELL_MS = 300;

/**
 * 停留在視窗內 DWELL_MS 才抓單檔快照（一生只抓一次）：
 * 選股池上百檔，伺服器端一次嵌入全部快照 payload 過大；
 * 而 Server Action 在瀏覽器端排隊執行，跳轉時沿路段落若都請求，目的地會排在最後。
 */
export function LazyBareKSlide({ code, name, strategies }: Props) {
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let cancelled = false;
        let requested = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const load = () => {
            requested = true;
            observer.disconnect();
            getStrategySnapshots([code])
                .then((map) => {
                    if (!cancelled) setState({ status: 'ready', snapshot: map.get(code) ?? null });
                })
                .catch((err: unknown) => {
                    console.error('[LazyBareKSlide]', code, err);
                    if (!cancelled) setState({ status: 'error' });
                });
        };

        const observer = new IntersectionObserver((entries) => {
            if (requested) return;
            const inView = entries.some((e) => e.isIntersecting);
            if (inView && timer === null) {
                timer = setTimeout(load, DWELL_MS);
            } else if (!inView && timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        });
        observer.observe(el);

        return () => {
            cancelled = true;
            if (timer !== null) clearTimeout(timer);
            observer.disconnect();
        };
    }, [code]);

    return <div ref={containerRef}>{renderState(state, code, name, strategies)}</div>;
}

function renderState(state: LoadState, code: string, name: string, strategies: string[]) {
    if (state.status === 'loading') {
        return (
            <div
                data-testid="lazy-bare-k-loading"
                className="glass-card rounded-2xl h-[480px] animate-pulse"
                aria-label={`${code} 圖表載入中`}
            />
        );
    }

    if (state.status === 'error') {
        return (
            <div className="glass-card rounded-2xl p-10 text-center">
                <p className="text-gray-500 font-medium">圖表載入失敗</p>
            </div>
        );
    }

    return (
        <BareKSlideContent
            code={code}
            name={name}
            strategies={strategies}
            snapshot={state.snapshot}
            noSnapshotMessage="此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新"
        />
    );
}
