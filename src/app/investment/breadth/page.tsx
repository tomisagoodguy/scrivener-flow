export const revalidate = 3600;

import { getAdlData } from '@/app/actions/getAdlData';
import { getRetailSentiment } from '@/app/actions/getRetailSentiment';
import AdlChart from './components/AdlChart';
import RetailSentimentCard from '@/components/features/RetailSentimentCard';

export const metadata = { title: '大盤廣度 | 投資監控' };

const CROSS_BADGE: Record<string, { label: string; cls: string }> = {
    golden: { label: '多頭廣度擴張', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    death: { label: '廣度收縮警訊', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
};

export default async function BreadthPage() {
    const [adlData, sentiment] = await Promise.all([
        getAdlData(),
        getRetailSentiment(),
    ]);

    const badge = CROSS_BADGE[adlData.crossStatus];

    return (
        <div>
            <div className="flex flex-wrap items-start gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">大盤廣度</h1>
                    <p className="text-sm text-gray-400">
                        騰落指標（ADL）· 全市場上市櫃
                        {adlData.latestDate && (
                            <span className="ml-2">
                                {adlData.latestDate} &nbsp;ADL {adlData.latestAdl !== null ? Math.round(adlData.latestAdl).toLocaleString() : '—'}
                            </span>
                        )}
                    </p>
                </div>
                {badge && (
                    <span className={`self-center px-3 py-1 rounded-full text-sm font-medium ${badge.cls}`}>
                        {badge.label}
                    </span>
                )}
            </div>

            {adlData.records.length === 0 ? (
                <div className="glass-card flex items-center justify-center h-64 text-gray-400">
                    資料尚未更新，請等待 Pipeline 執行後重整。
                </div>
            ) : (
                <AdlChart records={adlData.records} />
            )}

            <div className="mt-4 max-w-sm">
                <RetailSentimentCard data={sentiment} />
            </div>
        </div>
    );
}
