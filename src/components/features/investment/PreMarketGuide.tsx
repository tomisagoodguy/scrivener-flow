import { getServiceClient } from '@/lib/supabase/service';
import { PreMarketGuideCard, type GuideData } from './PreMarketGuideCard';
import { fetchSectorCategoryMap } from '@/lib/investment/sectorUtils';

// ── 型別 ──────────────────────────────────────────────────────────────────────

interface FlowStock {
    stock_code: string;
    stock_name: string;
    total_nt: number;
    etf_count: number;
    by_etf: { etf_code: string; nt: number; kind: string }[];
}

interface ByEtfEntry {
    net_flow: number;
    buy_count: number;
    sell_count: number;
}

interface FlowTotals {
    total_in_nt: number;
    total_out_nt: number;
    net_nt: number;
    stocks_count: number;
}

interface FlowData {
    data_date: string;
    etfs_covered: string[];
    etfs_lagging: string[];
    inflow: FlowStock[];
    outflow: FlowStock[];
    by_etf: Record<string, ByEtfEntry>;
    totals: FlowTotals;
}

// ── 門檻常數 ──────────────────────────────────────────────────────────────────

const CONSENSUS_BUY_MIN = 3;
const CONSENSUS_SELL_MIN = 3;
const SINGLE_BET_MIN_NT = 300_000_000;
const SINGLE_BET_MAX_SHOW = 10;
const BASKET_BUY_THRESHOLD = 0.5;
const TOTAL_ETFS = 21;

// ── 資料取得 ──────────────────────────────────────────────────────────────────

async function fetchFlowData(): Promise<FlowData | null> {
    const supabase = getServiceClient();
    const { data } = await supabase
        .from('etf_flow_daily')
        .select('data_date,etfs_covered,etfs_lagging,inflow,outflow,by_etf,totals')
        .gt('totals->>stocks_count', '0')
        .order('data_date', { ascending: false })
        .limit(1)
        .single();
    return (data as FlowData | null) ?? null;
}

// ── Server Component ───────────────────────────────────────────────────────────

export async function PreMarketGuide() {
    const data = await fetchFlowData();
    if (!data || data.totals.stocks_count === 0) return null;

    const { data_date, etfs_covered, totals, inflow, outflow, by_etf } = data;

    const allCodes = [...new Set([...inflow, ...outflow].map(s => s.stock_code))];
    const sectorMap = await fetchSectorCategoryMap(allCodes);

    const consensusBuys = inflow
        .filter(s => s.etf_count >= CONSENSUS_BUY_MIN)
        .map(s => ({
            stock_code: s.stock_code,
            stock_name: s.stock_name,
            total_nt: s.total_nt,
            etf_count: s.etf_count,
            etf_codes: s.by_etf.filter(b => b.nt > 0).map(b => b.etf_code),
            sector: sectorMap[s.stock_code],
        }));

    const singleBets = inflow
        .filter(s => s.etf_count < CONSENSUS_BUY_MIN && s.total_nt >= SINGLE_BET_MIN_NT)
        .slice(0, SINGLE_BET_MAX_SHOW)
        .map(s => ({
            stock_code: s.stock_code,
            stock_name: s.stock_name,
            total_nt: s.total_nt,
            etf_count: s.etf_count,
            etf_codes: s.by_etf.filter(b => b.nt > 0).map(b => b.etf_code),
            sector: sectorMap[s.stock_code],
        }));

    const consensusSells = outflow
        .filter(s => s.etf_count >= CONSENSUS_SELL_MIN)
        .map(s => ({
            stock_code: s.stock_code,
            stock_name: s.stock_name,
            total_nt: s.total_nt,
            etf_count: s.etf_count,
            etf_codes: s.by_etf.filter(b => b.nt < 0).map(b => b.etf_code),
            sector: sectorMap[s.stock_code],
        }));

    const byEtfEntries = Object.entries(by_etf).sort((a, b) => b[1].net_flow - a[1].net_flow);
    const topEtf = byEtfEntries[0];
    const isBasketBuy = totals.total_in_nt > 0 && !!topEtf &&
        topEtf[1].net_flow / totals.total_in_nt > BASKET_BUY_THRESHOLD;

    const month = new Date(data_date).getMonth() + 1;
    const day = new Date(data_date).getDate();

    const guideData: GuideData = {
        displayDate: `${month}/${day}`,
        coveredCount: etfs_covered.length,
        totalEtfs: TOTAL_ETFS,
        consensusBuys,
        singleBets,
        consensusSells,
        netNt: totals.net_nt,
        totalInNt: totals.total_in_nt,
        totalOutNt: totals.total_out_nt,
        isBasketBuy,
        basketPct: isBasketBuy ? Math.round(topEtf[1].net_flow / totals.total_in_nt * 100) : 0,
        basketEtf: topEtf?.[0] ?? '',
        stocksCount: totals.stocks_count,
    };

    return <PreMarketGuideCard data={guideData} />;
}
