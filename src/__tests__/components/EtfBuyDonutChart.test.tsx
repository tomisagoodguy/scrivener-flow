import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DiffLog, Holding } from '@/types/investment';

jest.mock('recharts', () => ({
    PieChart: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="pie-chart">{children}</div>
    ),
    Pie: ({ data }: { data: { name: string }[] }) => (
        <div data-testid="pie">{data?.map(d => d.name).join(',')}</div>
    ),
    Cell: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

import {
    aggregateBuyCapital,
    EtfBuyDonutChart,
} from '@/components/features/investment/EtfBuyDonutChart';

const makeLog = (
    change_type: DiffLog['change_type'],
    stock_code: string,
    diff_shares: number
): DiffLog => ({
    id: stock_code,
    data_date: '2026-05-06',
    change_type,
    stock_code,
    stock_name: `${stock_code} Corp`,
    diff_shares,
    diff_weight: 0.1,
    description: '',
});

const makeHolding = (stock_code: string, price: number): Holding => ({
    stock_id: stock_code,
    stock_code,
    stock_name: `${stock_code} Corp`,
    shares: 1000,
    weight: 1,
    price,
    change_percent: 0,
    amount: null,
    currency: 'TWD',
    is_disposal: false,
});

describe('aggregateBuyCapital', () => {
    it('returns empty array when no BUY/IN events', () => {
        const logs = [
            makeLog('SELL', '2330', 1000000),
            makeLog('OUT', '2454', 500000),
        ];
        const result = aggregateBuyCapital(logs, [makeHolding('2330', 980)]);
        expect(result).toHaveLength(0);
    });

    it('spec scenario: diff_shares=500000, price=200 → capital=1.0億', () => {
        const logs = [makeLog('BUY', '2330', 500000)];
        const holdings = [makeHolding('2330', 200)];
        const result = aggregateBuyCapital(logs, holdings);
        expect(result[0].capital).toBeCloseTo(1.0, 2); // 500000 * 200 / 1e8
    });

    it('filters only BUY and IN events', () => {
        const logs = [
            makeLog('BUY', 'A', 1000000),
            makeLog('IN', 'B', 500000),
            makeLog('SELL', 'C', 200000),
            makeLog('OUT', 'D', 100000),
            makeLog('CLOSE', 'E', 300000),
        ];
        const holdings = [
            makeHolding('A', 100),
            makeHolding('B', 100),
            makeHolding('C', 100),
            makeHolding('D', 100),
            makeHolding('E', 100),
        ];
        const result = aggregateBuyCapital(logs, holdings);
        const codes = result.map(r => r.code).filter(c => c !== '其他');
        expect(codes.every(c => c === 'A' || c === 'B')).toBe(true);
        expect(codes.length).toBe(2);
    });

    it('spec example: top-5 + 其他 when 8 BUY stocks', () => {
        const logs = Array.from({ length: 8 }, (_, i) =>
            makeLog('BUY', `S${i}`, (8 - i) * 100000)
        );
        const holdings = Array.from({ length: 8 }, (_, i) =>
            makeHolding(`S${i}`, 100)
        );
        const result = aggregateBuyCapital(logs, holdings);
        expect(result).toHaveLength(6); // 5 + 其他
        expect(result[5].code).toBe('其他');
    });

    it('no 其他 when ≤ 5 stocks', () => {
        const logs = Array.from({ length: 3 }, (_, i) =>
            makeLog('BUY', `S${i}`, 100000)
        );
        const holdings = Array.from({ length: 3 }, (_, i) =>
            makeHolding(`S${i}`, 100)
        );
        const result = aggregateBuyCapital(logs, holdings);
        expect(result).toHaveLength(3);
        expect(result.some(r => r.code === '其他')).toBe(false);
    });

    it('skips stocks with no matching price', () => {
        const logs = [
            makeLog('BUY', 'KNOWN', 1000000),
            makeLog('IN', 'UNKNOWN', 500000),
        ];
        const holdings = [makeHolding('KNOWN', 100)];
        const result = aggregateBuyCapital(logs, holdings);
        expect(result.some(r => r.code === 'UNKNOWN')).toBe(false);
        expect(result.some(r => r.code === 'KNOWN')).toBe(true);
    });
});

describe('EtfBuyDonutChart', () => {
    it('renders empty state when no BUY/IN events', () => {
        const logs = [makeLog('SELL', '2330', 1000000)];
        render(<EtfBuyDonutChart diffLogs={logs} holdings={[makeHolding('2330', 980)]} />);
        expect(screen.getByText('今日無買進紀錄')).toBeInTheDocument();
        expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });

    it('renders pie chart when BUY events exist', () => {
        const logs = [makeLog('BUY', '2330', 1000000)];
        const holdings = [makeHolding('2330', 980)];
        render(<EtfBuyDonutChart diffLogs={logs} holdings={holdings} />);
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
});
