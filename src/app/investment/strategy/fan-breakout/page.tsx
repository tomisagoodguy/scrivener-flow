import Link from 'next/link';
import { getFanBreakoutSignals } from '@/app/actions/getFanBreakoutSignals';
import FanBreakoutScreener from '@/components/features/strategy/FanBreakoutScreener';

export const dynamic = 'force-dynamic';

export default async function FanBreakoutPage() {
    const result = await getFanBreakoutSignals();

    return (
        <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-4 animate-fade-in">
            <div className="flex items-baseline gap-3 flex-wrap">
                <Link
                    href="/investment/strategy"
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    ← 策略選股中心
                </Link>
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">均線發散候選</h1>
                <span className="text-sm text-gray-400">最新訊號日：{result.latestDate ?? '—'}</span>
            </div>
            <FanBreakoutScreener result={result} />
        </main>
    );
}
