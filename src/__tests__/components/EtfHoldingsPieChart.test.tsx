import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock recharts so jsdom doesn't need ResizeObserver
jest.mock('recharts', () => ({
    PieChart: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="pie-chart">{children}</div>
    ),
    Pie: ({ data }: { data: { name: string }[] }) => (
        <div data-testid="pie">{data?.map(d => d.name).join(',')}</div>
    ),
    Cell: () => null,
    Tooltip: () => null,
    Legend: () => null,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

import {
    aggregateTopHoldings,
    EtfHoldingsPieChart,
} from '@/components/features/investment/EtfHoldingsPieChart';

const make13Holdings = () =>
    [9.0, 8.5, 7.2, 6.8, 6.1, 5.5, 4.9, 4.3, 3.8, 3.2, 2.1, 1.8, 1.4].map(
        (w, i) => ({ code: `S${i}`, name: `Stock ${i}`, weight_pct: w })
    );

describe('aggregateTopHoldings', () => {
    it('spec example: 13 holdings → top 10 + 其他 with correct sums', () => {
        const result = aggregateTopHoldings(make13Holdings());
        expect(result).toHaveLength(11);

        const top10Sum = result.slice(0, 10).reduce((s, h) => s + h.weight_pct, 0);
        expect(top10Sum).toBeCloseTo(59.3, 1);

        const others = result[10];
        expect(others.code).toBe('其他');
        expect(others.weight_pct).toBeCloseTo(5.3, 1);
    });

    it('no 其他 slice when holdings ≤ 10', () => {
        const holdings = Array.from({ length: 10 }, (_, i) => ({
            code: `X${i}`,
            name: `Stock ${i}`,
            weight_pct: 10,
        }));
        const result = aggregateTopHoldings(holdings);
        expect(result).toHaveLength(10);
        expect(result.some(h => h.code === '其他')).toBe(false);
    });

    it('sorts by weight_pct descending', () => {
        const holdings = [
            { code: 'A', name: 'A', weight_pct: 5 },
            { code: 'B', name: 'B', weight_pct: 10 },
            { code: 'C', name: 'C', weight_pct: 3 },
        ];
        const result = aggregateTopHoldings(holdings);
        expect(result[0].code).toBe('B');
        expect(result[1].code).toBe('A');
        expect(result[2].code).toBe('C');
    });

    it('handles fewer than 10 holdings without 其他', () => {
        const holdings = [
            { code: 'A', name: 'A', weight_pct: 30 },
            { code: 'B', name: 'B', weight_pct: 20 },
        ];
        const result = aggregateTopHoldings(holdings);
        expect(result).toHaveLength(2);
        expect(result.some(h => h.code === '其他')).toBe(false);
    });
});

describe('EtfHoldingsPieChart', () => {
    it('renders pie chart with data', () => {
        render(<EtfHoldingsPieChart holdings={make13Holdings()} />);
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('renders empty state when holdings is empty', () => {
        render(<EtfHoldingsPieChart holdings={[]} />);
        expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
});
