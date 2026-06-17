/**
 * ETF 連續同向加減碼（streak）計算工具。
 *
 * 連續定義以「ETF 回報日序號」為軸（design 決策 1）:對每支 ETF 取其所有
 * DISTINCT data_date 排序編序號(dseq);某回報日該股無異動(停手)或方向相反
 * 即斷。方向以 `diff_shares` 正負判定(決策 2)。「目前進行中」= streak 的
 * 最後序號等於該 ETF 軸的最新序號(決策 3)。
 *
 * gaps-and-islands 聚合在 Server 端以純 TypeScript 執行(design Context:
 * 「純粹在 Next.js Server 端即時聚合既有 etf_diff_logs」),而非 DB 端 CTE
 * ──supabase-js 無法執行 raw CTE,且 Non-Goals 禁止新增 DB 物件。
 */
import { getEtfMeta } from './etfRegistry';

export const MIN_STREAK_DAYS = 3;

export interface StreakRow {
    etf_code: string;
    stock_code: string;
    stock_name: string | null;
    direction: 'buy' | 'sell';
    streak_days: number; // 連續回報日數
    net_shares: number; // 區間淨股數(原始股,正負)
    start_date: string; // YYYY-MM-DD
    end_date: string;
    avg_shares_per_day: number; // net_shares / streak_days,推進速度
    is_sparse_source: boolean; // pocket 來源 → true
}

export interface StreaksResult {
    stockBuy: StreakRow[]; // 個股被連買(可跨 ETF,取該股最長進行中)
    stockSell: StreakRow[];
    etfBuy: StreakRow[]; // ETF 連買個股(per etf_code,streak_days 排序)
    etfSell: StreakRow[];
    asOfDate: string; // 全局最新 data_date
}

/** 原始 etf_diff_logs 列(僅取 streak 計算所需欄位)。 */
export interface DiffEvent {
    etf_code: string;
    stock_code: string;
    stock_name: string | null;
    data_date: string;
    diff_shares: number;
}

/** 平均每回報日推進股數(保留正負號)。streakDays 為 0 時回傳 0,避免除零。 */
export function computeAvgPace(netShares: number, streakDays: number): number {
    if (streakDays <= 0) return 0;
    return netShares / streakDays;
}

/** ETF 是否為稀疏回報來源(pocket):回報日不等於交易日,UI 需標註「N 個回報日」。 */
export function isSparseSource(etfCode: string): boolean {
    return getEtfMeta(etfCode)?.dataSource === 'pocket';
}

interface Run {
    direction: 'buy' | 'sell';
    streak_days: number;
    net_shares: number;
    start_date: string;
    end_date: string;
    last_dseq: number;
    stock_name: string | null;
}

/**
 * gaps-and-islands:對單一 (etf, stock) 已按 dseq 升冪排序的事件,切出連續同向段。
 * 方向改變或 dseq 不連續(中間有回報日無此股異動)即起新段。
 */
function buildRuns(entries: { dseq: number; date: string; shares: number; name: string | null }[]): Run[] {
    const runs: Run[] = [];
    let cur: Run | null = null;

    for (const ev of entries) {
        const direction: 'buy' | 'sell' = ev.shares > 0 ? 'buy' : 'sell';
        if (cur && cur.direction === direction && ev.dseq === cur.last_dseq + 1) {
            cur.streak_days += 1;
            cur.net_shares += ev.shares;
            cur.end_date = ev.date;
            cur.last_dseq = ev.dseq;
            if (ev.name) cur.stock_name = ev.name; // 取最近一筆非空名稱
        } else {
            cur = {
                direction,
                streak_days: 1,
                net_shares: ev.shares,
                start_date: ev.date,
                end_date: ev.date,
                last_dseq: ev.dseq,
                stock_name: ev.name,
            };
            runs.push(cur);
        }
    }

    return runs;
}

function toStreakRow(etfCode: string, stockCode: string, run: Run): StreakRow {
    return {
        etf_code: etfCode,
        stock_code: stockCode,
        stock_name: run.stock_name,
        direction: run.direction,
        streak_days: run.streak_days,
        net_shares: run.net_shares,
        start_date: run.start_date,
        end_date: run.end_date,
        avg_shares_per_day: computeAvgPace(run.net_shares, run.streak_days),
        is_sparse_source: isSparseSource(etfCode),
    };
}

/** streak_days 降冪,同天數以淨股數絕對值降冪。 */
function byStreakDesc(a: StreakRow, b: StreakRow): number {
    if (b.streak_days !== a.streak_days) return b.streak_days - a.streak_days;
    return Math.abs(b.net_shares) - Math.abs(a.net_shares);
}

/**
 * 從原始 diff 事件計算四視角目前進行中的連續同向 streak。
 * 純函式,無 I/O,供 getStreaks Server Action 在抓取資料後呼叫。
 */
export function computeStreaks(events: DiffEvent[]): StreaksResult {
    const rows = events.filter((e) => e.diff_shares !== 0);
    if (rows.length === 0) {
        return { stockBuy: [], stockSell: [], etfBuy: [], etfSell: [], asOfDate: '' };
    }

    const asOfDate = rows.reduce((max, e) => (e.data_date > max ? e.data_date : max), '');

    // 依 ETF 分組
    const byEtf = new Map<string, DiffEvent[]>();
    for (const e of rows) {
        const list = byEtf.get(e.etf_code);
        if (list) list.push(e);
        else byEtf.set(e.etf_code, [e]);
    }

    const inProgress: StreakRow[] = [];

    for (const [etfCode, etfEvents] of byEtf) {
        // 建立該 ETF 的回報日軸(distinct data_date 升冪 → dseq)
        const distinctDates = [...new Set(etfEvents.map((e) => e.data_date))].sort();
        const dseqOf = new Map<string, number>();
        distinctDates.forEach((dt, i) => dseqOf.set(dt, i));
        const maxDseq = distinctDates.length - 1;

        // 依股票分組,並把同股同日多筆 diff 聚合成單一淨值
        const byStock = new Map<string, Map<number, { date: string; shares: number; name: string | null }>>();
        for (const e of etfEvents) {
            const dseq = dseqOf.get(e.data_date)!;
            let perDay = byStock.get(e.stock_code);
            if (!perDay) {
                perDay = new Map();
                byStock.set(e.stock_code, perDay);
            }
            const slot = perDay.get(dseq);
            if (slot) {
                slot.shares += e.diff_shares;
                if (e.stock_name) slot.name = e.stock_name;
            } else {
                perDay.set(dseq, { date: e.data_date, shares: e.diff_shares, name: e.stock_name });
            }
        }

        for (const [stockCode, perDay] of byStock) {
            const entries = [...perDay.entries()]
                .map(([dseq, v]) => ({ dseq, date: v.date, shares: v.shares, name: v.name }))
                .filter((x) => x.shares !== 0) // 淨值為 0 視為當日無方向 → 斷點
                .sort((a, b) => a.dseq - b.dseq);

            for (const run of buildRuns(entries)) {
                const isCurrent = run.last_dseq === maxDseq;
                if (isCurrent && run.streak_days >= MIN_STREAK_DAYS) {
                    inProgress.push(toStreakRow(etfCode, stockCode, run));
                }
            }
        }
    }

    const etfBuy = inProgress.filter((r) => r.direction === 'buy').sort(byStreakDesc);
    const etfSell = inProgress.filter((r) => r.direction === 'sell').sort(byStreakDesc);

    return {
        etfBuy,
        etfSell,
        stockBuy: collapseByStock(etfBuy),
        stockSell: collapseByStock(etfSell),
        asOfDate,
    };
}

/** 個股視角:同一股可能被多支 ETF 同向連續操作,每股取最長的進行中 streak。 */
function collapseByStock(rows: StreakRow[]): StreakRow[] {
    const best = new Map<string, StreakRow>();
    for (const r of rows) {
        const cur = best.get(r.stock_code);
        if (!cur || byStreakDesc(r, cur) < 0) best.set(r.stock_code, r);
    }
    return [...best.values()].sort(byStreakDesc);
}
