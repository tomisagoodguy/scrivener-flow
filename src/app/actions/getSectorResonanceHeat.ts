'use server';

import { getEtfSectorActivity } from '@/app/actions/getEtfSectorActivity';
import { buildSectorResonanceHeat, type SectorResonanceHeat } from '@/lib/investment/sectorResonanceUtils';

export type { SectorResonanceHeat } from '@/lib/investment/sectorResonanceUtils';

export async function getSectorResonanceHeat(sectorDate: string): Promise<SectorResonanceHeat[]> {
    const activityMap = await getEtfSectorActivity(sectorDate);
    return buildSectorResonanceHeat(activityMap);
}
