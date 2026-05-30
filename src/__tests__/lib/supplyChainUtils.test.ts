/**
 * Tests for supply chain pure utility functions.
 *
 * TDD: Written BEFORE implementation.
 * Verifies getSupplyChainData and getTopicHoldings logic derivations.
 */

import { buildSupplyChainGraph, type ChainNode, type ChainEdge } from '@/lib/investment/supplyChainUtils';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOPICS = [
    { topic_id: 'asic-ip-design', name: 'ASIC/IP設計', short_name: 'ASIC', group_name: 'IC設計', color: '#6366f1' },
    { topic_id: 'wafer-foundry', name: '晶圓代工', short_name: '晶圓', group_name: '半導體製造', color: '#f59e0b' },
    { topic_id: 'cowos-advanced-packaging', name: 'CoWoS', short_name: 'CoWoS', group_name: '先進封測', color: '#ec4899' },
    { topic_id: 'isolated-topic', name: '孤立主題', short_name: '孤立', group_name: 'IC設計', color: '#888' },
];

const EDGES = [
    { source_topic_id: 'asic-ip-design', target_topic_id: 'wafer-foundry' },
    { source_topic_id: 'wafer-foundry', target_topic_id: 'cowos-advanced-packaging' },
];

// ---------------------------------------------------------------------------
// buildSupplyChainGraph
// ---------------------------------------------------------------------------

describe('buildSupplyChainGraph', () => {
    it('returns nodes only for topics that appear in at least one edge (spec: isolated topics hidden)', () => {
        // WHEN a topic exists but has no edges
        // THEN that topic is NOT in the nodes array
        const { nodes } = buildSupplyChainGraph(TOPICS, EDGES);
        const topicIds = nodes.map(n => n.topic_id);
        expect(topicIds).not.toContain('isolated-topic');
    });

    it('includes all topics that appear in edges', () => {
        const { nodes } = buildSupplyChainGraph(TOPICS, EDGES);
        const topicIds = nodes.map(n => n.topic_id);
        expect(topicIds).toContain('asic-ip-design');
        expect(topicIds).toContain('wafer-foundry');
        expect(topicIds).toContain('cowos-advanced-packaging');
    });

    it('returns edges as source/target pairs', () => {
        const { edges } = buildSupplyChainGraph(TOPICS, EDGES);
        expect(edges).toHaveLength(2);
        expect(edges[0]).toEqual({ source: 'asic-ip-design', target: 'wafer-foundry' });
        expect(edges[1]).toEqual({ source: 'wafer-foundry', target: 'cowos-advanced-packaging' });
    });

    it('node carries topic metadata', () => {
        const { nodes } = buildSupplyChainGraph(TOPICS, EDGES);
        const asic = nodes.find(n => n.topic_id === 'asic-ip-design');
        expect(asic?.short_name).toBe('ASIC');
        expect(asic?.group_name).toBe('IC設計');
        expect(asic?.color).toBe('#6366f1');
    });

    it('returns empty nodes and edges when no edges provided', () => {
        const { nodes, edges } = buildSupplyChainGraph(TOPICS, []);
        expect(nodes).toHaveLength(0);
        expect(edges).toHaveLength(0);
    });

    it('handles edge whose source topic is not in topics list gracefully', () => {
        const edgesWithUnknown = [
            { source_topic_id: 'unknown-topic', target_topic_id: 'wafer-foundry' },
            { source_topic_id: 'asic-ip-design', target_topic_id: 'wafer-foundry' },
        ];
        const { nodes, edges } = buildSupplyChainGraph(TOPICS, edgesWithUnknown);
        // Should still include wafer-foundry and asic-ip-design
        const topicIds = nodes.map(n => n.topic_id);
        expect(topicIds).toContain('asic-ip-design');
        expect(topicIds).toContain('wafer-foundry');
        // Edges should be included (even if topic metadata is missing)
        expect(edges).toHaveLength(2);
    });
});
