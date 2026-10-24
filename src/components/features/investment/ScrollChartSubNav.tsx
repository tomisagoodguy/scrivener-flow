'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ScrollSlide } from './ScrollChartViewer';

const BACK_CLASS =
    'flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-white/60 hover:bg-white border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-all shrink-0';
const STEP_CLASS =
    'p-1 rounded-lg disabled:opacity-25 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600';

interface Props {
    current: ScrollSlide | undefined;
    index: number;
    total: number;
    prev: ScrollSlide | null;
    next: ScrollSlide | null;
    onPrev: () => void;
    onNext: () => void;
    /** 有值時返回鍵為 button；否則為連結到 backHref */
    onBack?: () => void;
    backHref: string;
    backLabel: string;
}

/** 右側固定的快速跳轉點，目前股票放大標示。 */
export function ScrollChartDots({ slides, activeIndex, onJump }: { slides: ScrollSlide[]; activeIndex: number; onJump: (idx: number) => void }) {
    return (
        <nav aria-label="快速跳轉" className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
            {slides.map((slide, idx) => (
                <button
                    key={slide.code}
                    type="button"
                    onClick={() => onJump(idx)}
                    title={`${slide.code} ${slide.name}`}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        idx === activeIndex ? 'bg-blue-500 scale-150' : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-500'
                    }`}
                />
            ))}
        </nav>
    );
}

/** 捲動檢視器的 sticky 子導覽列：返回、目前股票、上/下一支與位置。 */
export function ScrollChartSubNav({ current, index, total, prev, next, onPrev, onNext, onBack, backHref, backLabel }: Props) {
    const backContent = (
        <>
            <ArrowLeft size={14} />
            <span>{backLabel}</span>
        </>
    );

    return (
        // sticky，貼在全局 Header（≈64px）下方
        <div className="sticky top-16 z-40 -mx-4 md:-mx-8 px-4 md:px-8 -mt-4 md:-mt-6 mb-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-slate-700/60">
            <div className="max-w-5xl mx-auto flex items-center gap-3">
                {onBack ? (
                    <button type="button" onClick={onBack} className={BACK_CLASS}>
                        {backContent}
                    </button>
                ) : (
                    <Link href={backHref} className={BACK_CLASS}>
                        {backContent}
                    </Link>
                )}

                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                    {current?.code}
                    {current?.name && <span className="ml-1.5 text-gray-400 font-normal">{current.name}</span>}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={onPrev}
                        disabled={!prev}
                        title={prev ? `${prev.code} ${prev.name}` : undefined}
                        className={STEP_CLASS}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-gray-400 tabular-nums min-w-[40px] text-center">
                        {index + 1} / {total}
                    </span>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!next}
                        title={next ? `${next.code} ${next.name}` : undefined}
                        className={STEP_CLASS}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
