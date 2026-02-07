/**
 * useStockWeightAnalysis Logic 測試 (純邏輯驗證)
 */

import { useStockWeightAnalysis } from '@/components/features/investment/hooks/useStockWeightAnalysis';
import type { DiffLog } from '@/types/investment';

// Mock React.useMemo 以便在測試環境中直接執行邏輯
jest.mock('react', () => ({
    useMemo: (fn: () => any) => fn(),
}));

const mockLogs: DiffLog[] = [
    {
        id: '1',
        data_date: '2024-05-20',
        change_type: 'BUY',
        stock_code: '2330',
        stock_name: '台積電',
        diff_shares: 1000,
        diff_weight: 0.5,
        description: '買入',
    },
    {
        id: '2',
        data_date: '2024-05-20',
        change_type: 'BUY',
        stock_code: '2317',
        stock_name: '鴻海',
        diff_shares: 500,
        diff_weight: 0.2,
        description: '買入',
    },
    {
        id: '3',
        data_date: '2024-05-19',
        change_type: 'SELL',
        stock_code: '2330',
        stock_name: '台積電',
        diff_shares: -500,
        diff_weight: -0.3,
        description: '賣出',
    },
    {
        id: '4',
        data_date: '2024-05-18',
        change_type: 'BUY',
        stock_code: '2454',
        stock_name: '聯發科',
        diff_shares: 300,
        diff_weight: 0.4,
        description: '買入',
    },
];

describe('useStockWeightAnalysis Logic', () => {
    it('應正確處理空資料', () => {
        const result = useStockWeightAnalysis([], '1D');
        expect(result.processedData).toEqual([]);
        expect(result.uniqueDates).toEqual([]);
    });

    it('1D 範圍應只計算最新日期的影響力', () => {
        const result = useStockWeightAnalysis(mockLogs, '1D');
        
        // 1D 應包含所有日期，但聚合時只取最新的 targetDates
        expect(result.uniqueDates).toEqual(['2024-05-20', '2024-05-19', '2024-05-18']);
        expect(result.processedData).toHaveLength(2); // 只應有 2330, 2317
        
        const tsmc = result.processedData.find(d => d.code === '2330');
        expect(tsmc?.impact).toBe(0.5);
    });

    it('3D 範圍應聚合多日數據', () => {
        const result = useStockWeightAnalysis(mockLogs, '3D');
        
        // 3D 應包含所有 3 天的資料
        // 台積電: 0.5 (20號) + (-0.3) (19號) = 0.2
        const tsmc = result.processedData.find(d => d.code === '2330');
        expect(tsmc?.impact).toBeCloseTo(0.2);
        
        // 聯發科: 0.4 (18號)
        const mtk = result.processedData.find(d => d.code === '2454');
        expect(mtk?.impact).toBe(0.4);
    });

    it('應正確回傳排序後的唯一日期', () => {
        const result = useStockWeightAnalysis(mockLogs, '5D');
        expect(result.uniqueDates[0]).toBe('2024-05-20');
        expect(result.uniqueDates[1]).toBe('2024-05-19');
        expect(result.uniqueDates[2]).toBe('2024-05-18');
    });

    it('資料不存在時應優雅處理 (Null Safety)', () => {
        // @ts-ignore
        const result = useStockWeightAnalysis(null, '1D');
        expect(result.processedData).toEqual([]);
    });
});
