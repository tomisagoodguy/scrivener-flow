/**
 * 跨 ETF 窗口同步加碼聚合邏輯（純函式，供 getWindowMomentum Server Action 使用）。
 *
 * 同步加碼判定：各 ETF 在窗口內的淨 diff_shares > 0 才計入家數，
 * 避免同窗口先買後賣的 ETF 被誤計為加碼。
 */

export interface WindowDiffEvent {
    etf_code: string;
    stock_code: string;
    stock_name: string | null;
    data_date: string;
    diff_shares: number;
    diff_weight: number | null;
}

export interface EtfAccumulationDetail {
    etfCode: string;
    netShares: number;
    netWeightChange: number;
}

export type AbsorptionTrend = 'accelerating' | 'steady' | 'decaying';

export interface AggregatedMomentumStock {
    stockCode: string;
    stockName: string;
    etfCount: number;
    totalAccumulatedShares: number;
    totalWeightChange: number;
    maxSingleWeightChange: number;
    etfDetails: EtfAccumulationDetail[];
    /** 加碼 ETF 的淨股數依日期分布，供吸量趨勢計算 */
    sharesByDate: Record<string, number>;
}

export function aggregateWindowMomentum(
    events: WindowDiffEvent[],
    minEtfCount: number,
): AggregatedMomentumStock[] {
    // (stock_code, etf_code) → 淨股數 / 淨權重 / 日分布
    interface PairAgg {
        netShares: number;
        netWeight: number;
        sharesByDate: Record<string, number>;
    }
    const pairs = new Map<string, Map<string, PairAgg>>();
    const stockNames = new Map<string, string>();
    const maxSingleWeight = new Map<string, number>();

    for (const e of events) {
        const shares = Number(e.diff_shares);
        const weight = e.diff_weight === null ? 0 : Number(e.diff_weight);
        if (!Number.isFinite(shares)) continue;

        let etfMap = pairs.get(e.stock_code);
        if (!etfMap) {
            etfMap = new Map();
            pairs.set(e.stock_code, etfMap);
        }
        let agg = etfMap.get(e.etf_code);
        if (!agg) {
            agg = { netShares: 0, netWeight: 0, sharesByDate: {} };
            etfMap.set(e.etf_code, agg);
        }
        agg.netShares += shares;
        agg.netWeight += weight;
        agg.sharesByDate[e.data_date] = (agg.sharesByDate[e.data_date] ?? 0) + shares;

        if (e.stock_name && !stockNames.has(e.stock_code)) {
            stockNames.set(e.stock_code, e.stock_name);
        }
        const prevMax = maxSingleWeight.get(e.stock_code);
        if (prevMax === undefined || weight > prevMax) {
            maxSingleWeight.set(e.stock_code, weight);
        }
    }

    const result: AggregatedMomentumStock[] = [];
    for (const [stockCode, etfMap] of pairs) {
        const etfDetails: EtfAccumulationDetail[] = [];
        let totalShares = 0;
        let totalWeight = 0;
        const sharesByDate: Record<string, number> = {};

        for (const [etfCode, agg] of etfMap) {
            if (agg.netShares <= 0) continue; // 淨增持 > 0 才算加碼
            etfDetails.push({ etfCode, netShares: agg.netShares, netWeightChange: agg.netWeight });
            totalShares += agg.netShares;
            totalWeight += agg.netWeight;
            for (const [date, shares] of Object.entries(agg.sharesByDate)) {
                sharesByDate[date] = (sharesByDate[date] ?? 0) + shares;
            }
        }

        if (etfDetails.length < minEtfCount) continue;

        etfDetails.sort((a, b) => b.netWeightChange - a.netWeightChange);
        result.push({
            stockCode,
            stockName: stockNames.get(stockCode) ?? '',
            etfCount: etfDetails.length,
            totalAccumulatedShares: totalShares,
            totalWeightChange: totalWeight,
            maxSingleWeightChange: maxSingleWeight.get(stockCode) ?? 0,
            etfDetails,
            sharesByDate,
        });
    }

    result.sort(
        (a, b) => b.etfCount - a.etfCount || b.totalAccumulatedShares - a.totalAccumulatedShares,
    );
    return result;
}

/** 吸量比 = 窗口加碼股數 ÷ 窗口市場總成交股數；分母無效時回傳 null */
export function computeAbsorptionRatio(
    accumulatedShares: number,
    windowVolume: number | null,
): number | null {
    if (windowVolume === null || !Number.isFinite(windowVolume) || windowVolume <= 0) return null;
    return accumulatedShares / windowVolume;
}

/** 窗口交易日（升冪）切分為前後半；奇數窗口後半多一天 */
export function splitWindowHalves(datesAsc: string[]): {
    firstHalf: string[];
    secondHalf: string[];
} {
    const mid = Math.floor(datesAsc.length / 2);
    return { firstHalf: datesAsc.slice(0, mid), secondHalf: datesAsc.slice(mid) };
}

/** 吸量趨勢：後半 > 前半×1.2 → accelerating；後半 < 前半×0.8 → decaying；其餘 steady */
export function computeAbsorptionTrend(
    sharesByDate: Record<string, number>,
    windowDatesAsc: string[],
): AbsorptionTrend {
    const { firstHalf, secondHalf } = splitWindowHalves(windowDatesAsc);
    const sum = (dates: string[]) => dates.reduce((acc, d) => acc + (sharesByDate[d] ?? 0), 0);
    const first = sum(firstHalf);
    const second = sum(secondHalf);
    if (second > first * 1.2) return 'accelerating';
    if (second < first * 0.8) return 'decaying';
    return 'steady';
}
