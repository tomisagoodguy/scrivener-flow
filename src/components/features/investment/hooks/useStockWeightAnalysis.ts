import { useMemo } from 'react';
import { DiffLog } from '@/types/investment';

export type TimeRange = '1D' | '3D' | '5D';

export interface StockImpact {
    code: string;
    name: string;
    impact: number;
    industry?: string;
    currentWeight?: number; // Optional: If available from other sources or calculation
}

interface UseStockWeightAnalysisResult {
    processedData: StockImpact[];
    uniqueDates: string[];
}

export function useStockWeightAnalysis(
    logs: DiffLog[],
    timeRange: TimeRange
): UseStockWeightAnalysisResult {
    return useMemo(() => {
        if (!logs || logs.length === 0) {
            return { processedData: [], uniqueDates: [] };
        }

        // 1. Get all unique dates sorted descending (latest first)
        const uniqueDates = [...new Set(logs.map(l => l.data_date))].sort().reverse();

        // 2. Determine how many days to look back
        const daysToTake = timeRange === '1D' ? 1 : timeRange === '3D' ? 3 : 5;
        const targetDates = uniqueDates.slice(0, daysToTake);

        // 3. Filter logs for these dates
        const targetLogs = logs.filter(l => targetDates.includes(l.data_date));

        // 4. Aggregate diff_weight by stock_code
        // Use a Map for better performance with large datasets
        const aggregationMap = new Map<string, StockImpact>();

        for (const log of targetLogs) {
            const code = log.stock_code;
            const weightChange = Number(log.diff_weight) || 0;
            
            const existing = aggregationMap.get(code);

            if (existing) {
                existing.impact += weightChange;
            } else {
                aggregationMap.set(code, {
                    code: log.stock_code,
                    name: log.stock_name,
                    industry: log.industry,
                    impact: weightChange,
                });
            }
        }

        // Convert Map to Array
        const result = Array.from(aggregationMap.values());

        // We don't sort here by default to let the UI decide, 
        // OR we can return a default sort (impact desc).
        // Let's implement the sort by absolute impact as a default utility, 
        // but consumers might re-sort. 
        // For consistency with previous logic, we just return the aggregated list.
        
        return {
            processedData: result,
            uniqueDates,
        };

    }, [logs, timeRange]);
}
