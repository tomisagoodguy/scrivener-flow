'use client';

import React, { useMemo } from 'react';
import { getOverlapColor, truncateList } from './EtfComparePanelUtils';
import { EtfCard, OverlapSummary, OverlapLegend } from './EtfComparePanelFilter';

export { getOverlapColor, truncateList };

// ── 型別定義 ────────────────────────────────────────────────────────────────

interface HoldingItem { stock_code: string; stock_name: string; weight: number; rank: number; in_etfs: string[] }
interface SectorItem { sector_name: string; weight: number }

export interface EtfData {
    etf_code: string;
    name: string;
    manager: string;
    color: string;
    data_date: string | null;
    holdings: HoldingItem[];
    aum_100m_twd: number | null;
    sectors: SectorItem[];
}

export interface OverlapData {
    /** byCount[n] = 恰好被 n 支 ETF 持有的股票代號陣列（n >= 2） */
    byCount: Record<number, string[]>;
    totalEtfs: number;
}

// ── 主元件 ───────────────────────────────────────────────────────────────────

export function EtfComparePanel({ etfs, overlap }: { etfs: EtfData[]; overlap: OverlapData }) {
    const { byCount, totalEtfs } = overlap;

    const overlapMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const [countStr, codes] of Object.entries(byCount)) {
            const n = Number(countStr);
            for (const code of codes) map.set(code, n);
        }
        return map;
    }, [byCount]);

    const totalUnique = useMemo(() => {
        const codes = new Set<string>();
        etfs.forEach(e => e.holdings.forEach(h => codes.add(h.stock_code)));
        return codes.size;
    }, [etfs]);

    const gridClass = etfs.length <= 3
        ? `grid grid-cols-1 ${etfs.length >= 2 ? 'lg:grid-cols-2' : ''} ${etfs.length === 3 ? 'xl:grid-cols-3' : ''} gap-4`
        : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';

    return (
        <div className="space-y-4">
            <OverlapSummary byCount={byCount} totalEtfs={totalEtfs} totalUnique={totalUnique} />
            <OverlapLegend byCount={byCount} totalEtfs={totalEtfs} />
            <div className={gridClass}>
                {etfs.map((etf) => (
                    <EtfCard key={etf.etf_code} etf={etf} overlapMap={overlapMap} totalEtfs={totalEtfs} />
                ))}
            </div>
        </div>
    );
}
