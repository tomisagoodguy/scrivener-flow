// 動態渲染：快取只交給 getBuyingPatternStats 內的 unstable_cache（成功快取 1 小時、失敗不快取）。
// 若用頁面層 revalidate，查詢失敗時渲染出的空頁面會被整頁快取。
export const dynamic = 'force-dynamic';

import { getBuyingPatternStats } from '@/app/actions/getBuyingPatternStats';
import BuyingPatternCharts from './BuyingPatternCharts';
import PatternBaselineTable from './PatternBaselineTable';

export default async function BuyingPatternsPage() {
    const stats = await getBuyingPatternStats();
    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">買進模式前瞻報酬分析</h1>
            <BuyingPatternCharts stats={stats} />
            <PatternBaselineTable stats={stats} />
        </div>
    );
}
