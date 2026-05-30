'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TopicHoldingsPanel } from '@/components/features/TopicHoldingsPanel';
import type { ChainNode, ChainEdge } from '@/lib/investment/supplyChainUtils';

const SupplyChainGraph = dynamic(
    () => import('@/components/features/SupplyChainGraph').then(m => ({ default: m.SupplyChainGraph })),
    { ssr: false, loading: () => <div className="h-[600px] flex items-center justify-center text-gray-400 animate-pulse">供應鏈圖載入中...</div> },
);

interface Props {
    nodes: ChainNode[];
    edges: ChainEdge[];
}

export function SupplyChainPageClient({ nodes, edges }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const focusedTopicId = searchParams.get('focus');

    const focusedTopic = focusedTopicId
        ? nodes.find(n => n.topic_id === focusedTopicId)
        : null;

    const handleNodeClick = useCallback((topicId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (params.get('focus') === topicId) {
            params.delete('focus');
        } else {
            params.set('focus', topicId);
        }
        router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    return (
        <div className="flex gap-4">
            {/* Left: DAG graph */}
            <div className="flex-1 min-w-0 glass-card overflow-hidden rounded-xl">
                <SupplyChainGraph
                    chainNodes={nodes}
                    chainEdges={edges}
                    focusedTopicId={focusedTopicId}
                    onNodeClick={handleNodeClick}
                />
            </div>

            {/* Right: Holdings panel */}
            <div className="w-72 shrink-0" style={{ height: 600 }}>
                <TopicHoldingsPanel
                    topicId={focusedTopicId}
                    topicName={focusedTopic?.name ?? undefined}
                />
            </div>
        </div>
    );
}
