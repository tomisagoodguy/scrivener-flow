'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
    type Node,
    type Edge,
    MarkerType,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import type { ChainNode, ChainEdge } from '@/lib/investment/supplyChainUtils';

// ---------------------------------------------------------------------------
// Group → color mapping (structural colors, not semantic red/green)
// ---------------------------------------------------------------------------

const GROUP_COLORS: Record<string, string> = {
    'AI 伺服器': '#3b82f6',
    'IC 設計': '#6366f1',
    '先進封測': '#ec4899',
    '光學應用': '#f97316',
    '半導體材料製程': '#f59e0b',
    '多元產業': '#6b7280',
    '散熱散能': '#ef4444',
    '智能製造工業': '#14b8a6',
    '消費性裝置': '#a855f7',
    '綠能環保': '#22c55e',
    '網路衛星': '#0ea5e9',
    '被動元件': '#d97706',
    '記憶體': '#10b981',
    '軟體服務': '#8b5cf6',
    '電動車': '#06b6d4',
    '電子零組件': '#84cc16',
};

function getGroupColor(groupName: string | null): string {
    if (!groupName) return '#94a3b8';
    return GROUP_COLORS[groupName] ?? '#94a3b8';
}

// ---------------------------------------------------------------------------
// Dagre layout
// ---------------------------------------------------------------------------

function applyDagreLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });

    nodes.forEach(n => g.setNode(n.id, { width: 120, height: 40 }));
    edges.forEach(e => g.setEdge(e.source, e.target));

    dagre.layout(g);

    return {
        nodes: nodes.map(n => {
            const pos = g.node(n.id);
            return { ...n, position: { x: pos.x - 60, y: pos.y - 20 } };
        }),
        edges,
    };
}

// ---------------------------------------------------------------------------
// Custom node
// ---------------------------------------------------------------------------

interface ChainNodeData extends Record<string, unknown> {
    short_name: string;
    group_name: string | null;
    isFocused: boolean;
}

function ChainNodeComponent({ data }: { data: ChainNodeData }) {
    const color = getGroupColor(data.group_name);
    return (
        <div
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-white text-center whitespace-nowrap shadow cursor-pointer"
            style={{
                backgroundColor: color,
                border: data.isFocused ? '3px solid #fff' : '2px solid transparent',
                boxShadow: data.isFocused ? `0 0 12px ${color}` : undefined,
                minWidth: 90,
            }}
        >
            {data.short_name}
        </div>
    );
}

const nodeTypes = { chainNode: ChainNodeComponent };

// ---------------------------------------------------------------------------
// Inner (needs ReactFlowProvider context)
// ---------------------------------------------------------------------------

interface Props {
    chainNodes: ChainNode[];
    chainEdges: ChainEdge[];
    focusedTopicId: string | null;
    onNodeClick: (topicId: string) => void;
}

function FlowInner({ chainNodes, chainEdges, focusedTopicId, onNodeClick }: Props) {
    const { fitView, setCenter } = useReactFlow();

    const rawNodes = useMemo<Node[]>(() => chainNodes.map(n => ({
        id: n.topic_id,
        type: 'chainNode' as const,
        position: { x: 0, y: 0 },
        data: {
            short_name: n.short_name,
            group_name: n.group_name,
            isFocused: n.topic_id === focusedTopicId,
        } as ChainNodeData,
    })), [chainNodes, focusedTopicId]);

    const rawEdges = useMemo<Edge[]>(() => chainEdges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#94a3b8' },
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
    })), [chainEdges]);

    const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
        () => applyDagreLayout(rawNodes, rawEdges),
        [rawNodes, rawEdges],
    );

    const [nodes, , onNodesChange] = useNodesState(layoutNodes);
    const [edges, , onEdgesChange] = useEdgesState(layoutEdges);

    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        onNodeClick(node.id);
    }, [onNodeClick]);

    useEffect(() => {
        if (!focusedTopicId) {
            fitView({ padding: 0.1, duration: 400 });
            return;
        }
        const target = layoutNodes.find(n => n.id === focusedTopicId);
        if (target) {
            setTimeout(() => {
                setCenter(target.position.x + 60, target.position.y + 20, { duration: 400, zoom: 1.2 });
            }, 100);
        } else {
            fitView({ padding: 0.1, duration: 400 });
        }
    }, [focusedTopicId, layoutNodes, fitView, setCenter]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
        >
            <Background />
            <Controls />
            <MiniMap zoomable pannable />
        </ReactFlow>
    );
}

// ---------------------------------------------------------------------------
// Exported component (wraps FlowInner with ReactFlowProvider)
// ---------------------------------------------------------------------------

export function SupplyChainGraph(props: Props) {
    return (
        <div style={{ width: '100%', height: 600 }}>
            <ReactFlowProvider>
                <FlowInner {...props} />
            </ReactFlowProvider>
        </div>
    );
}
