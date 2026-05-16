import { getSectorStrength } from '@/app/actions/getSectorStrength';
import SectorDashboard from './SectorDashboard';

export const metadata = { title: '族群強弱 | 投資監控' };

export default async function SectorsPage() {
    const data = await getSectorStrength();

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">族群強弱</h1>
            <p className="text-sm text-gray-400 mb-4">全市場資金流向，點擊族群展開成分股</p>
            <SectorDashboard data={data} />
        </div>
    );
}
