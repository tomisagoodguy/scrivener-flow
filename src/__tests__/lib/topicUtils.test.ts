/**
 * Tests for topic-related pure utility functions.
 *
 * TDD: Written BEFORE implementation of topic attachment and filter logic.
 * Verifies spec scenarios for etf-holding-topic-tags and sector-topic-heatmap.
 */

import { attachTopicsToHoldings, filterHoldingsByTopic, aggregateTopicWeights } from '@/lib/investment/topicUtils';
import type { Holding } from '@/types/investment';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeHolding = (stock_code: string, weight: number = 1): Holding => ({
    stock_id: stock_code,
    stock_code,
    stock_name: `${stock_code}股票`,
    shares: 1000,
    weight,
    price: 100,
    change_percent: 0,
    amount: null,
    currency: 'TWD',
    is_disposal: false,
});

const TOPIC_ASSIGNMENTS: Record<string, { topic_id: string; short_name: string; color: string }[]> = {
    '2330': [
        { topic_id: 'asic-ip', short_name: 'ASIC', color: '#6366f1' },
        { topic_id: 'hpc-network', short_name: 'HPC', color: '#8b5cf6' },
        { topic_id: 'ai-server', short_name: 'AI伺服器', color: '#f59e0b' },
        { topic_id: 'cowos', short_name: 'CoWoS', color: '#ef4444' }, // 4th, should be trimmed
    ],
    '2317': [
        { topic_id: 'ai-server', short_name: 'AI伺服器', color: '#f59e0b' },
    ],
    '1101': [],
};

// ---------------------------------------------------------------------------
// attachTopicsToHoldings
// ---------------------------------------------------------------------------

describe('attachTopicsToHoldings', () => {
    it('attaches up to 3 topic chips per holding (spec: max 3 topics)', () => {
        // Scenario: Stock has topics
        // WHEN a holding has entries in stock_topic_assignments
        // THEN up to 3 topic chips are rendered
        const holdings = [makeHolding('2330')];
        const result = attachTopicsToHoldings(holdings, TOPIC_ASSIGNMENTS);

        expect(result[0].topics).toHaveLength(3);
    });

    it('attaches topic short_name and color correctly', () => {
        const holdings = [makeHolding('2330')];
        const result = attachTopicsToHoldings(holdings, TOPIC_ASSIGNMENTS);

        const topics = result[0].topics!;
        expect(topics[0].short_name).toBe('ASIC');
        expect(topics[0].color).toBe('#6366f1');
        expect(topics[0].topic_id).toBe('asic-ip');
    });

    it('returns empty topics array when stock has no assignments (spec: no placeholder)', () => {
        // Scenario: Stock has no topics
        // WHEN a holding has no entries in stock_topic_assignments
        // THEN no topic chips are rendered (empty array, not null)
        const holdings = [makeHolding('1101')];
        const result = attachTopicsToHoldings(holdings, TOPIC_ASSIGNMENTS);

        expect(result[0].topics).toEqual([]);
    });

    it('handles stock not in assignment map', () => {
        const holdings = [makeHolding('9999')]; // not in map
        const result = attachTopicsToHoldings(holdings, TOPIC_ASSIGNMENTS);

        expect(result[0].topics).toEqual([]);
    });

    it('attaches topics to all holdings', () => {
        const holdings = [makeHolding('2330'), makeHolding('2317'), makeHolding('1101')];
        const result = attachTopicsToHoldings(holdings, TOPIC_ASSIGNMENTS);

        expect(result[0].topics).toHaveLength(3); // capped at 3
        expect(result[1].topics).toHaveLength(1);
        expect(result[2].topics).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// filterHoldingsByTopic
// ---------------------------------------------------------------------------

describe('filterHoldingsByTopic', () => {
    it('returns all holdings when topic is null', () => {
        const holdings = [makeHolding('2330'), makeHolding('2317'), makeHolding('1101')];
        const result = filterHoldingsByTopic(holdings, null, TOPIC_ASSIGNMENTS);
        expect(result).toHaveLength(3);
    });

    it('filters to only holdings with matching topic_id (spec: topic filter result count)', () => {
        // GIVEN holdings include 2330 and 2317 with topic 'ai-server', 1101 without
        // WHEN topic = 'ai-server'
        // THEN only holdings with that topic_id are shown
        const holdings = [makeHolding('2330'), makeHolding('2317'), makeHolding('1101')];
        const result = filterHoldingsByTopic(holdings, 'ai-server', TOPIC_ASSIGNMENTS);

        expect(result).toHaveLength(2);
        expect(result.map(h => h.stock_code)).toEqual(expect.arrayContaining(['2330', '2317']));
    });

    it('returns empty array when no holdings match topic', () => {
        const holdings = [makeHolding('1101')];
        const result = filterHoldingsByTopic(holdings, 'cowos', TOPIC_ASSIGNMENTS);
        expect(result).toHaveLength(0);
    });

    it('returns empty array when topic does not exist at all', () => {
        const holdings = [makeHolding('2330')];
        const result = filterHoldingsByTopic(holdings, 'nonexistent-topic', TOPIC_ASSIGNMENTS);
        expect(result).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// aggregateTopicWeights (for heatmap server action)
// ---------------------------------------------------------------------------

describe('aggregateTopicWeights', () => {
    const topics = [
        { topic_id: 'ai-server', name: 'AI伺服器', short_name: 'AI', color: '#f59e0b' },
        { topic_id: 'asic-ip', name: 'ASIC', short_name: 'ASIC', color: '#6366f1' },
        { topic_id: 'empty-topic', name: '空主題', short_name: '空', color: '#000' },
    ];

    const holdings = [
        { stock_code: '2330', weight: 5.0 },
        { stock_code: '2317', weight: 3.0 },
        { stock_code: '2454', weight: 2.0 },
    ];

    const assignments: { stock_code: string; topic_id: string }[] = [
        { stock_code: '2330', topic_id: 'ai-server' },
        { stock_code: '2317', topic_id: 'ai-server' },
        { stock_code: '2330', topic_id: 'asic-ip' },
        { stock_code: '2454', topic_id: 'asic-ip' },
    ];

    it('computes total_weight as sum of holding weights for each topic', () => {
        const result = aggregateTopicWeights(topics, assignments, holdings);
        const aiServer = result.find(r => r.topic_id === 'ai-server');
        expect(aiServer?.total_weight).toBeCloseTo(8.0); // 5.0 + 3.0
    });

    it('counts distinct holdings per topic', () => {
        const result = aggregateTopicWeights(topics, assignments, holdings);
        const asic = result.find(r => r.topic_id === 'asic-ip');
        expect(asic?.holding_count).toBe(2); // 2330 + 2454
    });

    it('excludes topics with zero ETF holdings (spec: no ETF holdings for a topic)', () => {
        // WHEN a topic exists in stock_topics but none of its stocks are in ETF holdings
        // THEN that topic is NOT in the heatmap result
        const result = aggregateTopicWeights(topics, assignments, holdings);
        expect(result.find(r => r.topic_id === 'empty-topic')).toBeUndefined();
    });

    it('returns results sorted by total_weight descending', () => {
        const result = aggregateTopicWeights(topics, assignments, holdings);
        expect(result[0].topic_id).toBe('ai-server'); // 8.0 > 7.0
        expect(result[1].topic_id).toBe('asic-ip');   // 5.0 + 2.0 = 7.0
    });
});
