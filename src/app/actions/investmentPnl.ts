'use server';

import { createClient } from '@/lib/supabase/server';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';

// Task 1.5: change_type values confirmed from codebase: IN, BUY, SELL, OUT, CLOSE
export type ChangeType = 'IN' | 'BUY' | 'SELL' | 'OUT' | 'CLOSE';

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
    IN:    '首次建倉',
    BUY:   '加碼',
    SELL:  '減碼',
    OUT:   '出清',
    CLOSE: '大幅縮減',
};

export interface DiffEvent {
    date: string;
    changeType: ChangeType;
    diffShares: number;
    estimatedAmount: number; // |Δshares × close| in 萬元
}

export interface StockPnlResult {
    etfCode: string;
    etfName: string;
    stockCode: string;
    pnl: number;        // 億元
    pnlPct: number;     // %
    mvNow: number;      // 億元
    costBasis: number;  // 億元
    minDate: string;
    curve: { date: string; value: number }[]; // daily P&L in 億元
    sharesHistory: { date: string; shares: number }[];
    priceHistory: { date: string; close: number }[];
    events: DiffEvent[];
    status: 'ok' | 'no_price' | 'no_shares';
}

// Task 1.2: close_on_or_before carry-forward
function buildCloseLookup(priceRows: { data_date: string; close: unknown }[]) {
    const sortedDates = priceRows.map(p => p.data_date); // assumed ASC from query
    const priceMap = new Map<string, number>(
        priceRows.map(p => [p.data_date, Number(p.close)])
    );
    return function closeOnOrBefore(date: string): number | null {
        let lo = 0, hi = sortedDates.length - 1, found = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if ((sortedDates[mid] ?? '') <= date) { found = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        if (found < 0) return null;
        return priceMap.get(sortedDates[found]!) ?? null;
    };
}

// Internal helper: accepts an already-created supabase client to avoid createClient() in parallel
async function _computeStockPnlWithClient(
    supabase: Awaited<ReturnType<typeof createClient>>,
    etfCode: string,
    stockCode: string,
): Promise<StockPnlResult> {
    const etfMeta = ETF_REGISTRY.find(e => e.code === etfCode);

    const base: Omit<StockPnlResult, 'status'> = {
        etfCode,
        etfName: etfMeta?.name ?? etfCode,
        stockCode,
        pnl: 0, pnlPct: 0, mvNow: 0, costBasis: 0,
        minDate: '',
        curve: [], sharesHistory: [], priceHistory: [], events: [],
    };

    const [weightRes, priceRes, diffRes] = await Promise.all([
        supabase
            .from('etf_weight_history')
            .select('data_date, shares, weight')
            .eq('etf_code', etfCode)
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: true }),
        supabase
            .from('stock_prices_daily')
            .select('data_date, close')
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: true }),
        supabase
            .from('etf_diff_logs')
            .select('data_date, change_type, diff_shares')
            .eq('etf_code', etfCode)
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: true }),
    ]);

    const weightRows = (weightRes.data ?? []).filter(r => r.shares != null);
    if (weightRows.length === 0) return { ...base, status: 'no_shares' };

    const priceRows = priceRes.data ?? [];
    if (priceRows.length === 0) return { ...base, status: 'no_price' };

    const closeLookup = buildCloseLookup(priceRows);
    const minDate = weightRows[0]!.data_date as string;

    let prevShares = 0;
    let cumCF = 0;
    let costBasis = 0;

    const curve: StockPnlResult['curve'] = [];
    const sharesHistory: StockPnlResult['sharesHistory'] = [];

    for (const row of weightRows) {
        const shares = Number(row.shares);
        const close = closeLookup(row.data_date as string);
        sharesHistory.push({ date: row.data_date as string, shares });

        if (close === null) { prevShares = shares; continue; }

        const deltaShares = shares - prevShares;
        const cf = -deltaShares * close;
        cumCF += cf;
        costBasis += Math.max(0, -cf);

        const pnlAtT = shares * close + cumCF;
        curve.push({
            date: row.data_date as string,
            value: Math.round(pnlAtT / 1e6) / 100,
        });
        prevShares = shares;
    }

    const lastRow = weightRows[weightRows.length - 1]!;
    const latestClose = closeLookup(lastRow.data_date as string);
    const latestShares = Number(lastRow.shares);
    const mvNowRaw = latestClose !== null ? latestShares * latestClose : 0;
    const pnlRaw = mvNowRaw + cumCF;
    const pnl = Math.round(pnlRaw / 1e6) / 100;
    const mvNow = Math.round(mvNowRaw / 1e6) / 100;
    const costBasis億 = Math.round(costBasis / 1e6) / 100;
    const pnlPct = costBasis > 0 ? Math.round((pnlRaw / costBasis) * 10000) / 100 : 0;

    const priceHistory = priceRows
        .filter(p => (p.data_date as string) >= minDate)
        .map(p => ({ date: p.data_date as string, close: Number(p.close) }));

    const events: DiffEvent[] = (diffRes.data ?? []).map(d => {
        const close = closeLookup(d.data_date as string) ?? 0;
        const diffShares = Number(d.diff_shares ?? 0);
        return {
            date: d.data_date as string,
            changeType: d.change_type as ChangeType,
            diffShares,
            estimatedAmount: Math.round(Math.abs(diffShares * close) / 1e4) / 100,
        };
    });

    return {
        etfCode, etfName: etfMeta?.name ?? etfCode, stockCode,
        pnl, pnlPct, mvNow, costBasis: costBasis億,
        minDate, curve, sharesHistory, priceHistory, events,
        status: 'ok',
    };
}

// Task 1.1: public server action — creates its own client then delegates to helper
export async function computeStockPnl(
    etfCode: string,
    stockCode: string,
): Promise<StockPnlResult> {
    const supabase = await createClient();
    return _computeStockPnlWithClient(supabase, etfCode, stockCode);
}

// Task 1.4: getStockManagerPnl — parallel across all ETFs holding this stock
export async function getStockManagerPnl(stockCode: string): Promise<StockPnlResult[]> {
    const supabase = await createClient();

    const { data: etfRows, error: etfErr } = await supabase
        .from('etf_weight_history')
        .select('etf_code')
        .eq('stock_code', stockCode);

    if (etfErr || !etfRows || etfRows.length === 0) return [];

    const uniqueEtfs = [...new Set(etfRows.map(r => r.etf_code as string))];

    // Use shared client — avoids concurrent createClient() calls in Promise.all
    const results = await Promise.all(
        uniqueEtfs.map(etfCode => _computeStockPnlWithClient(supabase, etfCode, stockCode))
    );

    return results.filter(r => r.status === 'ok' || r.minDate !== '');
}
