'use client';

import React from 'react';
import type { EtfMechanicsData } from '@/app/actions/getEtfMechanics';
import { PremiumDiscountChart } from './mechanics/PremiumDiscountChart';
import { DividendTimeline } from './mechanics/DividendTimeline';
import { DecompositionPanel } from './mechanics/DecompositionPanel';

interface EtfMechanicsTabProps {
    data: EtfMechanicsData;
}

/** 深潛頁「市場機制」Tab：折溢價走勢 + 配息時間軸 + AUM 成長拆解。 */
export function EtfMechanicsTab({ data }: EtfMechanicsTabProps) {
    return (
        <div className="w-full space-y-6">
            <PremiumDiscountChart series={data.premiumSeries} navConnected={data.navConnected} />
            <DecompositionPanel decomposition={data.decomposition} aggregates={data.aggregates} />
            <DividendTimeline dividends={data.dividends} />
        </div>
    );
}
