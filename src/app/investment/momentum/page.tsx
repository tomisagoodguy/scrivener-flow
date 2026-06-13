export const revalidate = 3600;

import { Suspense } from 'react';
import { getWindowMomentum } from '@/app/actions/getWindowMomentum';
import { MomentumCard } from './components/MomentumCard';
import { MomentumFilter } from './components/MomentumFilter';

const VALID_WINDOWS = [3, 5, 10, 14];
const VALID_MIN_COUNTS = [2, 3, 5];
const DEFAULT_WINDOW = 5;
const DEFAULT_MIN_COUNT = 2;

function parseParam(raw: string | undefined, valid: number[], fallback: number): number {
    const value = parseInt(raw ?? '', 10);
    return valid.includes(value) ? value : fallback;
}

export default async function MomentumPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string>>;
}) {
    const params = await searchParams;
    const windowDays = parseParam(params.window, VALID_WINDOWS, DEFAULT_WINDOW);
    const minEtfCount = parseParam(params.min_count, VALID_MIN_COUNTS, DEFAULT_MIN_COUNT);

    const { stocks, windowStart, windowEnd } = await getWindowMomentum(windowDays, minEtfCount);

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            ⚡ 多家投信同步加碼
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            {windowStart
                                ? `過去 ${windowDays} 個交易日（${windowStart} → ${windowEnd}）內，共 ${stocks.length} 檔個股被 ${minEtfCount} 家以上主動式 ETF 同步淨加碼`
                                : '暫無交易日資料，請先執行 ETF Pipeline 同步資料'}
                        </p>
                    </div>
                    <Suspense fallback={null}>
                        <MomentumFilter currentWindow={windowDays} currentMinCount={minEtfCount} />
                    </Suspense>
                </div>
            </div>

            {/* Card grid */}
            {stocks.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-slate-400 text-lg">窗口內無同步加碼個股</p>
                    <p className="text-slate-400 text-sm mt-2">
                        過去 {windowDays} 個交易日內，沒有個股被 {minEtfCount} 家以上 ETF 同步淨加碼，
                        可嘗試放寬觀察天數或降低最少家數
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {stocks.map((stock) => (
                        <MomentumCard
                            key={stock.stockCode}
                            stock={stock}
                            windowStart={windowStart}
                            windowEnd={windowEnd}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
