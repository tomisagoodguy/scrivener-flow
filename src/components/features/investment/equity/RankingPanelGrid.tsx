import { TrendingUp, Users } from 'lucide-react';
import type { RankingData, SortKey, SortDir } from '@/lib/investment/equityPageData';
import { RankingTable } from './RankingTable';

function Panel({ icon: Icon, title, subtitle, children }: { icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center">
                    <Icon size={16} className="text-rose-600" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

import React from 'react';

export function RankingPanelGrid({ data, sort, dir }: { data: RankingData; sort: SortKey | null; dir: SortDir }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel icon={TrendingUp} title="主力買進" subtitle={`大戶持股比例增加 · 共 ${data.bigHolderRanking.length} 檔`}>
                {data.bigHolderRanking.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-6">尚無資料</p>
                    : <RankingTable rows={data.bigHolderRanking} source="equity" priceIndicators={data.priceIndicators} currentSort={sort} currentDir={dir} etfMap={data.etfMap} flowMap={data.flowMap} />}
            </Panel>
            <Panel icon={Users} title="散戶減少" subtitle={`總股東人數減少 · 共 ${data.retailDeclineRanking.length} 檔`}>
                {data.retailDeclineRanking.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-6">尚無資料</p>
                    : <RankingTable rows={data.retailDeclineRanking} source="equity-retail" priceIndicators={data.priceIndicators} currentSort={sort} currentDir={dir} etfMap={data.etfMap} flowMap={data.flowMap} />}
            </Panel>
        </div>
    );
}
