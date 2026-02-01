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
}

export interface LinePoint {
    time: string;
    value: number;
}

export class IndicatorService {
    /**
     * Calculate Simple Moving Average (SMA)
     */
    static calculateSMA(data: PriceData[], period: number): LinePoint[] {
        const smaData: LinePoint[] = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) continue;
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
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
