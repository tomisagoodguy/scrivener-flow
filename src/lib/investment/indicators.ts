/**
 * Indicator Service
 * Handles technical indicator calculations for stock data.
 */

export interface PriceData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    value: number;
    amount: number;
    margin_ratio: number;
    it_buy?: number; // 投信買賣超
}

export interface LinePoint {
    time: string;
    value: number;
}

export class IndicatorService {
    /**
     * Calculate Simple Moving Average (SMA) for Close Price
     */
    static calculateSMA(data: PriceData[], period: number): LinePoint[] {
        return this.calculateFieldSMA(data, 'close', period);
    }

    /**
     * Calculate SMA for any numeric field
     */
    static calculateFieldSMA(data: any[], field: string, period: number): LinePoint[] {
        const smaData: LinePoint[] = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) continue;
            let sum = 0;
            for (let j = 0; j < period; j++) {
                // Ensure data exists and is number
                const val = data[i - j][field];
                sum += (typeof val === 'number') ? val : 0;
            }
            smaData.push({ 
                time: data[i].time, 
                value: sum / period 
            });
        }
        return smaData;
    }

    /**
     * Future-proofing: Add more indicators here without bloating components
     */
    static calculateRSI(data: PriceData[], period: number = 14): LinePoint[] {
        // Implementation for later...
        return [];
    }
}
