'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollChartDots, ScrollChartSubNav } from './ScrollChartSubNav';

export interface ScrollSlide {
    code: string;
    name: string;
}

export interface ScrollChartViewerProps<T extends ScrollSlide> {
    slides: T[];
    initialIndex: number;
    renderSlide: (slide: T, index: number) => ReactNode;
    renderHeaderExtra?: (slide: T, index: number) => ReactNode;
    /** 與 onBack 二擇一；都沒給時為 '/investment/bare-k' */
    backHref?: string;
    /** 有值時返回鍵為 button，點擊呼叫此回呼 */
    onBack?: () => void;
    backLabel?: string;
    onActiveChange?: (slide: T, index: number) => void;
    /** 是否顯示右側跳轉點（仍需超過 3 支）；檔數過多（點會超出畫面）時傳 false */
    showJumpDots?: boolean;
}

/** 全局 Header（≈64px）+ sub-nav（≈48px）+ 8px 間距 */
const STICKY_OFFSET = 120;

function neighbours(idx: number, length: number): number[] {
    return [idx - 1, idx, idx + 1].filter((i) => i >= 0 && i < length);
}

/**
 * 連續捲動的圖表檢視器殼層：sticky 子導覽列、逐股 section、只渲染已到訪 ±1 的內容、
 * 超過 3 支時顯示右側跳轉點。每格內容與標題附加資訊由呼叫端提供。
 */
export function ScrollChartViewer<T extends ScrollSlide>({
    slides,
    initialIndex,
    renderSlide,
    renderHeaderExtra,
    backHref = '/investment/bare-k',
    onBack,
    backLabel = '返回',
    onActiveChange,
    showJumpDots = true,
}: ScrollChartViewerProps<T>) {
    const sectionsRef = useRef<(HTMLElement | null)[]>([]);
    const headersRef = useRef<(HTMLElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [rendered, setRendered] = useState<Set<number>>(() => new Set(neighbours(initialIndex, slides.length)));
    // 以 ref 持有最新回呼，避免回呼身分改變時重建 observer
    const onActiveChangeRef = useRef(onActiveChange);
    useEffect(() => {
        onActiveChangeRef.current = onActiveChange;
    }, [onActiveChange]);

    // 初始跳到目標 section（與 scrollToIndex 同樣扣掉 sticky 區高度，標題才不會被子導覽列蓋住）。
    // 第 1 支若仍在 sticky 區下方就不捲，保留檢視器上方的篩選列；已捲過頭（例如捲動中換篩選而重掛載）才捲回
    useEffect(() => {
        const el = sectionsRef.current[initialIndex];
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (initialIndex === 0 && top >= STICKY_OFFSET) return;
        window.scrollTo({ top: top + window.scrollY - STICKY_OFFSET, behavior: 'instant' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // IntersectionObserver：觀察每個 section 的標題 div
    // rootMargin 上方留 ~128px（全局 Header ≈64px + sub-nav ≈48px + 緩衝）
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const idx = Number(entry.target.getAttribute('data-idx'));
                    const slide = slides[idx];
                    if (isNaN(idx) || !slide) return;

                    setActiveIndex(idx);
                    setRendered((prev) => new Set([...prev, ...neighbours(idx, slides.length)]));
                    onActiveChangeRef.current?.(slide, idx);
                });
            },
            { threshold: 0, rootMargin: '-120px 0px -40% 0px' },
        );

        headersRef.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, [slides]);

    const scrollToIndex = useCallback((idx: number) => {
        const el = sectionsRef.current[idx];
        if (!el) return;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET, behavior: 'smooth' });
    }, []);

    const prev = activeIndex > 0 ? slides[activeIndex - 1] : null;
    const next = activeIndex < slides.length - 1 ? slides[activeIndex + 1] : null;

    return (
        <div>
            <ScrollChartSubNav
                current={slides[activeIndex]}
                index={activeIndex}
                total={slides.length}
                prev={prev}
                next={next}
                onPrev={() => prev && scrollToIndex(activeIndex - 1)}
                onNext={() => next && scrollToIndex(activeIndex + 1)}
                onBack={onBack}
                backHref={backHref}
                backLabel={backLabel}
            />

            <div className="max-w-5xl mx-auto space-y-8">
                {slides.map((slide, idx) => (
                    <section key={slide.code} ref={(el) => { sectionsRef.current[idx] = el; }}>
                        {/* 標題（供 IntersectionObserver 偵測） */}
                        <div
                            data-idx={idx}
                            ref={(el) => { headersRef.current[idx] = el; }}
                            className="flex items-center gap-2 mb-3 flex-wrap"
                        >
                            <span className="text-xs text-gray-300 dark:text-slate-600 tabular-nums">{idx + 1}</span>
                            <span className="font-semibold text-gray-700 dark:text-slate-300">{slide.code}</span>
                            {slide.name && <span className="text-gray-400 text-sm">{slide.name}</span>}
                            {renderHeaderExtra?.(slide, idx)}
                        </div>

                        {rendered.has(idx) ? (
                            renderSlide(slide, idx)
                        ) : (
                            <div className="glass-card rounded-2xl p-4 animate-pulse space-y-3">
                                <div className="h-5 bg-gray-200/60 rounded w-32" />
                                <div className="h-72 bg-gray-100/60 rounded" />
                            </div>
                        )}
                    </section>
                ))}
            </div>

            {/* 右側快速跳轉點（超過 3 支才顯示） */}
            {showJumpDots && slides.length > 3 && <ScrollChartDots slides={slides} activeIndex={activeIndex} onJump={scrollToIndex} />}
        </div>
    );
}
