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
     * Calculate Relative Strength Index (RSI)
     * Uses Wilder's smoothing method (EMA-based).
     */
    static calculateRSI(data: PriceData[], period: number = 14): LinePoint[] {
        if (data.length < period + 1) return [];

        const rsiData: LinePoint[] = [];
        let avgGain = 0;
        let avgLoss = 0;

        // 初始平均：前 period 根的漲跌幅
        for (let i = 1; i <= period; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change > 0) avgGain += change;
            else avgLoss += -change;
        }
        avgGain /= period;
        avgLoss /= period;

        const firstRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        rsiData.push({ time: data[period].time, value: parseFloat(firstRsi.toFixed(2)) });

        // Wilder's smoothing（後續每根）
        for (let i = period + 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? -change : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
            const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
            rsiData.push({ time: data[i].time, value: parseFloat(rsi.toFixed(2)) });
        }

        return rsiData;
    }
}
