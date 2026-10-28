export const revalidate = 3600;

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllHoldings } from '@/lib/investment/holdingsUtils';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { buildPoolChartRows } from '@/lib/investment/poolChartUtils';
import { PoolChartViewer } from '@/components/features/investment/pool/PoolChartViewer';

/** 選股池圖表瀏覽：全部主動式 ETF 台股成分股的連續捲動裸K圖（快照由 client 按需載入）。 */
export default async function PoolChartPage() {
    const { byEtf, latestDate } = await getAllHoldings();
    const rows = buildPoolChartRows(byEtf, ETF_CODES);

    return (
        <div className="min-h-screen p-6 animate-fade-in">
            <div className="max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/investment" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-white/60 hover:bg-white border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-all dark:bg-slate-800 dark:text-white">
                        <ArrowLeft size={14} /> 返回
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">選股池圖表瀏覽</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            全部主動式 ETF 台股成分股 {rows.length} 檔 · 依持有 ETF 數排序
                            {latestDate && <span className="ml-2 text-blue-500 font-medium">資料日期：{latestDate}</span>}
                        </p>
                    </div>
                </div>
                <PoolChartViewer rows={rows} />
            </div>
        </div>
    );
}
