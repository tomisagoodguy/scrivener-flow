import { AumScalePanel } from '@/components/features/investment/AumScalePanel';
import { AumGrowthRankingTable } from '@/components/features/investment/AumGrowthRankingTable';
import { getAumGrowthRanking } from '@/app/actions/getEtfMechanics';

export default async function EtfComparePage() {
    const ranking = await getAumGrowthRanking();
    return (
        <div className="container mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    ETF 規模分析
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    各主動 ETF 資產規模、申購流向與成長來源
                </p>
            </div>
            <AumGrowthRankingTable rows={ranking} />
            <AumScalePanel />
        </div>
    );
}
