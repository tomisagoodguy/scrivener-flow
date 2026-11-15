jest.mock('next/cache', () => ({
    unstable_cache: (fn: () => unknown) => fn,
}));
const mockPublicClient = { from: jest.fn() };
jest.mock('@/lib/supabase/service', () => ({ getPublicClient: jest.fn(() => mockPublicClient) }));
jest.mock('@/lib/investment/weightHistoryData', () => ({ fetchWeightHistory: jest.fn() }));

import { fetchWeightHistory } from '@/lib/investment/weightHistoryData';
import { getEtfWeightHistory90d, getStockWeightHistory90d } from '../getWeightHistory';

const COLUMNS = 'etf_code, stock_code, stock_name, data_date, weight, rank';

describe('getWeightHistory server actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(new Date('2026-11-15T04:00:00Z'));
    });
    afterEach(() => jest.useRealTimers());

    it('ETF version filters by etfCodes only, from 90 days ago', async () => {
        const rows = [{ etf_code: '00981A', stock_code: '2330', stock_name: '台積電', data_date: '2026-11-13', weight: 9, rank: 1 }];
        (fetchWeightHistory as jest.Mock).mockResolvedValue(rows);
        await expect(getEtfWeightHistory90d('00981A')).resolves.toEqual(rows);
        expect(fetchWeightHistory).toHaveBeenCalledWith(
            mockPublicClient,
            { etfCodes: ['00981A'], fromDate: '2026-08-17' },
            COLUMNS,
        );
    });

    it('stock version filters by stockCode only, from 90 days ago', async () => {
        (fetchWeightHistory as jest.Mock).mockResolvedValue([]);
        await getStockWeightHistory90d('2330');
        expect(fetchWeightHistory).toHaveBeenCalledWith(
            mockPublicClient,
            { stockCode: '2330', fromDate: '2026-08-17' },
            COLUMNS,
        );
    });

    it.each(['', '   ', '2330;drop', 'x'.repeat(11)])('rejects invalid code %j without reading', async code => {
        await expect(getEtfWeightHistory90d(code)).rejects.toThrow('Invalid code');
        await expect(getStockWeightHistory90d(code)).rejects.toThrow('Invalid code');
        expect(fetchWeightHistory).not.toHaveBeenCalled();
    });

    it('propagates read failures instead of returning empty data', async () => {
        (fetchWeightHistory as jest.Mock).mockRejectedValue(new Error('etf_weight_history: timeout'));
        await expect(getEtfWeightHistory90d('00981A')).rejects.toThrow('timeout');
        await expect(getStockWeightHistory90d('2330')).rejects.toThrow('timeout');
    });
});
