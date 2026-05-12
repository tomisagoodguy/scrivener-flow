import { getBuyingPatternStats } from '@/app/actions/getBuyingPatternStats';
import BuyingPatternCharts from './BuyingPatternCharts';

export default async function BuyingPatternsPage() {
    const stats = await getBuyingPatternStats();
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">買進模式前瞻報酬分析</h1>
            <BuyingPatternCharts stats={stats} />
        </div>
    );
}
