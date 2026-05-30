import { Suspense } from 'react';
import { getSupplyChainData } from '@/app/actions/getSupplyChainData';
import { SupplyChainPageClient } from './SupplyChainPageClient';

export const metadata = { title: '產業鏈 | 投資監控' };
export const revalidate = 3600;

export default async function SupplyChainPage() {
    const { nodes, edges } = await getSupplyChainData();

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">台股科技產業鏈</h1>
                <p className="text-sm text-gray-400">
                    {nodes.length} 個主題節點 · {edges.length} 條供應鏈關係 · 點擊節點查看 ETF 持股
                </p>
            </div>
            <Suspense fallback={<div className="h-[600px] animate-pulse bg-gray-100 dark:bg-slate-800 rounded-xl" />}>
                <SupplyChainPageClient nodes={nodes} edges={edges} />
            </Suspense>
        </div>
    );
}
