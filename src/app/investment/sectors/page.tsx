import { getSectorStrength } from '@/app/actions/getSectorStrength';
import { getFactorIC } from '@/app/actions/getFactorIC';
import { getEtfSectorActivity, type EtfSectorActivityMap } from '@/app/actions/getEtfSectorActivity';
import SectorDashboard from './SectorDashboard';

export const metadata = { title: '族群強弱 | 投資監控' };

const SECTOR_PROXY_FACTORS = ['sector_ret_1d', 'sector_ret_5d', 'vol_ratio_20d', 'above_ma20_pct'];

export default async function SectorsPage() {
    const [sectorData, icData] = await Promise.all([
        getSectorStrength(),
        getFactorIC(SECTOR_PROXY_FACTORS, 12),
    ]);
    const etfActivity = await getEtfSectorActivity(sectorData.date);

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">族群強弱</h1>
            <p className="text-sm text-gray-400 mb-4">全市場資金流向，點擊族群展開成分股</p>
            <SectorDashboard data={sectorData} icData={icData} etfActivity={etfActivity} />
        </div>
    );
}

export type { EtfSectorActivityMap };
