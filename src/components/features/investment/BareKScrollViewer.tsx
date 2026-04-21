'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { BareKChart } from './BareKChart';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

export interface StockSlide {
    code: string;
    name: string;
    strategies: string[];
    snapshot: BareKSnapshot | null;
}

interface Props {
    slides: StockSlide[];
    initialIndex: number;
    isOwner?: boolean;
}

export function BareKScrollViewer({ slides, initialIndex, isOwner = false }: Props) {
    const sectionsRef = useRef<(HTMLElement | null)[]>([]);
    const headersRef = useRef<(HTMLElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [rendered, setRendered] = useState<Set<number>>(
        () => new Set([
            Math.max(0, initialIndex - 1),
            initialIndex,
            Math.min(slides.length - 1, initialIndex + 1),
        ])
    );

    // 初始跳到目標 section
    useEffect(() => {
        const el = sectionsRef.current[initialIndex];
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
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
                    if (isNaN(idx)) return;

                    setActiveIndex(idx);
                    setRendered((prev) => {
                        const next = new Set(prev);
                        [idx - 1, idx, idx + 1].forEach((i) => {
                            if (i >= 0 && i < slides.length) next.add(i);
                        });
                        return next;
                    });
                    const code = slides[idx]?.code;
                    if (code) history.replaceState(null, '', `/investment/bare-k/${code}`);
                });
            },
            { threshold: 0, rootMargin: '-120px 0px -40% 0px' }
        );

        headersRef.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides]);

    const scrollToIndex = useCallback((idx: number) => {
        const el = sectionsRef.current[idx];
        if (!el) return;
        // 補償全局 Header（≈64px）+ sub-nav（≈48px）+ 8px 間距
        const offset = el.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    }, []);

    const prev = activeIndex > 0 ? slides[activeIndex - 1] : null;
    const next = activeIndex < slides.length - 1 ? slides[activeIndex + 1] : null;

    return (
        <div>
            {/* Sub-nav：sticky，貼在全局 Header（≈64px）下方 */}
            <div className="sticky top-16 z-40 -mx-4 md:-mx-8 px-4 md:px-8 -mt-4 md:-mt-6 mb-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-slate-700/60">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    {/* 返回列表 */}
                    <Link
                        href="/investment/bare-k"
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-white/60 hover:bg-white border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-all shrink-0"
                    >
                        <ArrowLeft size={14} />
                        <span>返回</span>
                    </Link>

                    {/* 目前股票 */}
                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                        {slides[activeIndex]?.code}
                        {slides[activeIndex]?.name && (
                            <span className="ml-1.5 text-gray-400 font-normal">{slides[activeIndex].name}</span>
                        )}
                    </span>

                    {/* Prev / 位置 / Next */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => prev && scrollToIndex(activeIndex - 1)}
                            disabled={!prev}
                            title={prev ? `${prev.code} ${prev.name}` : undefined}
                            className="p-1 rounded-lg disabled:opacity-25 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs text-gray-400 tabular-nums min-w-[40px] text-center">
                            {activeIndex + 1} / {slides.length}
                        </span>
                        <button
                            onClick={() => next && scrollToIndex(activeIndex + 1)}
                            disabled={!next}
                            title={next ? `${next.code} ${next.name}` : undefined}
                            className="p-1 rounded-lg disabled:opacity-25 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 全部股票連續排列 */}
            <div className="max-w-5xl mx-auto space-y-8">
                {slides.map((slide, idx) => (
                    <section
                        key={slide.code}
                        ref={(el) => { sectionsRef.current[idx] = el; }}
                    >
                        {/* 標題（供 IntersectionObserver 偵測） */}
                        <div
                            data-idx={idx}
                            ref={(el) => { headersRef.current[idx] = el; }}
                            className="flex items-center gap-2 mb-3"
                        >
                            <span className="text-xs text-gray-300 dark:text-slate-600 tabular-nums">{idx + 1}</span>
                            <span className="font-semibold text-gray-700 dark:text-slate-300">{slide.code}</span>
                            {slide.name && <span className="text-gray-400 text-sm">{slide.name}</span>}
                        </div>

                        {/* 圖表 */}
                        {rendered.has(idx) ? (
                            slide.snapshot ? (
                                <div className="glass-card rounded-2xl p-4">
                                    <BareKChart
                                        snapshot={slide.snapshot}
                                        stockName={slide.name}
                                        strategies={slide.strategies}
                                    />
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl p-10 text-center">
                                    <p className="text-gray-500 font-medium mb-1">{slide.code} 的裸K資料尚未同步</p>
                                    {isOwner && (
                                        <p className="text-sm text-gray-400">
                                            請確認已在
                                            <Link href="/investment/watch-list" className="text-blue-500 hover:underline mx-1">
                                                自選股管理
                                            </Link>
                                            加入此股票
                                        </p>
                                    )}
                                </div>
                            )
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
            {slides.length > 3 && (
                <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
                    {slides.map((slide, idx) => (
                        <button
                            key={slide.code}
                            onClick={() => scrollToIndex(idx)}
                            title={`${slide.code} ${slide.name}`}
                            className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                idx === activeIndex
                                    ? 'bg-blue-500 scale-150'
                                    : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-500'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
