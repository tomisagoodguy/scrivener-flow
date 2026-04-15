import { createClient } from '@/lib/supabase/server';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import { NextResponse } from 'next/server';

const ALL_ETF_CODES = ETF_REGISTRY.map(e => e.code);
const ETF_META = Object.fromEntries(
    ETF_REGISTRY.map(e => [e.code, { name: e.name, manager: e.manager, color: e.color }])
);

export interface EtfHoldingItem {
    stock_code: string;
    stock_name: string;
    weight: number;
    rank: number;
    in_etfs: string[];
    is_new?: boolean;
}

export interface EtfCompareData {
    etf_code: string;
    name: string;
    manager: string;
    color: string;
    data_date: string | null;
    holdings: EtfHoldingItem[];
    aum_100m_twd: number | null;
    sectors: { sector_name: string; weight: number }[];
}

/**
 * GET /api/investment/etf-compare?date=YYYY-MM-DD
 *
 * 回傳所有主動 ETF 的持股快照、規模 (AUM)、產業分布，
 * 並計算交集重疊（byCount[n] = 被 n 支 ETF 同時持有的股票代號）。
 *
 * Cache: 1 小時重新驗證
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedDate = searchParams.get('date');

        const supabase = await createClient();

        // 1. 決定目標日期
        let targetDate = requestedDate;
        if (!targetDate) {
            const { data: dateRows } = await supabase
                .from('etf_holdings_snapshot')
                .select('data_date')
                .in('etf_code', ALL_ETF_CODES)
                .order('data_date', { ascending: false })
                .limit(1);
            targetDate = dateRows?.[0]?.data_date ?? null;
        }

        if (!targetDate) {
            return NextResponse.json({ error: 'No data available' }, { status: 404 });
        }

        // 2. 批次查詢持股
        const { data: allHoldings } = await supabase
            .from('etf_holdings_snapshot')
            .select('etf_code, stock_code, stock_name, weight, data_date')
            .in('etf_code', ALL_ETF_CODES)
            .eq('data_date', targetDate)
            .order('weight', { ascending: false });

        // 只取當天有資料的 ETF
        const activeCodes = [...new Set((allHoldings ?? []).map(h => h.etf_code))];

        // 3. 查詢 AUM（最新日期）
        const { data: aumRows } = await supabase
            .from('etf_aum')
            .select('etf_code, aum_100m_twd, snapshot_date')
            .in('etf_code', activeCodes)
            .order('snapshot_date', { ascending: false })
            .limit(activeCodes.length * 3);

        // 4. 查詢產業分布
        const { data: sectorRows } = await supabase
            .from('etf_sectors')
            .select('etf_code, sector_name, weight, snapshot_date')
            .in('etf_code', activeCodes)
            .order('snapshot_date', { ascending: false })
            .limit(activeCodes.length * 30);

        // 5. 建立交集 map：stock_code → 持有它的 ETF 清單
        const stockEtfMap: Record<string, string[]> = {};
        for (const h of allHoldings ?? []) {
            if (!stockEtfMap[h.stock_code]) stockEtfMap[h.stock_code] = [];
            if (!stockEtfMap[h.stock_code].includes(h.etf_code)) {
                stockEtfMap[h.stock_code].push(h.etf_code);
            }
        }

        // 6. 組裝每支 ETF 的回傳資料
        const result: EtfCompareData[] = activeCodes.map((etf_code) => {
            const holdings = (allHoldings ?? [])
                .filter(h => h.etf_code === etf_code)
                .map((h, idx) => ({
                    stock_code: h.stock_code,
                    stock_name: h.stock_name,
                    weight: h.weight ?? 0,
                    rank: idx + 1,
                    in_etfs: stockEtfMap[h.stock_code] ?? [etf_code],
                }));

            const latestAum = (aumRows ?? [])
                .filter(a => a.etf_code === etf_code)
                .sort((a, b) =>
                    new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
                )[0];

            const latestSectorDate = (sectorRows ?? [])
                .filter(s => s.etf_code === etf_code)
                .sort((a, b) =>
                    new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
                )[0]?.snapshot_date;

            const sectors = (sectorRows ?? [])
                .filter(s => s.etf_code === etf_code && s.snapshot_date === latestSectorDate)
                .map(s => ({ sector_name: s.sector_name, weight: s.weight ?? 0 }))
                .sort((a, b) => b.weight - a.weight);

            return {
                etf_code,
                ...(ETF_META[etf_code] ?? { name: etf_code, manager: '', color: '#6366f1' }),
                data_date: targetDate,
                holdings,
                aum_100m_twd: latestAum?.aum_100m_twd ?? null,
                sectors,
            };
        });

        // 7. byCount[n] = 恰好被 n 支 ETF 持有的股票代號清單（n >= 2）
        const byCount: Record<number, string[]> = {};
        for (const [code, etfList] of Object.entries(stockEtfMap)) {
            const n = etfList.length;
            if (n >= 2) {
                if (!byCount[n]) byCount[n] = [];
                byCount[n].push(code);
            }
        }

        return NextResponse.json({
            date: targetDate,
            etfs: result,
            overlap: {
                byCount,
                totalEtfs: activeCodes.length,
            },
        });
    } catch (err) {
        console.error('etf-compare API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
