import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ETF_CODES = ['00980A', '00981A', '00991A'] as const;

const ETF_META: Record<string, { name: string; manager: string; color: string }> = {
    '00980A': { name: '野村智慧優選', manager: '野村投信', color: '#3b82f6' },
    '00981A': { name: '主動統一台股增長', manager: '統一投信', color: '#8b5cf6' },
    '00991A': { name: '復華未來50', manager: '復華投信', color: '#f59e0b' },
};

export interface EtfHoldingItem {
    stock_code: string;
    stock_name: string;
    weight: number;
    rank: number;
    in_etfs: string[];   // 哪些 ETF 持有此股
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
 * 回傳三支主動 ETF (00980A / 00981A / 00991A) 的持股快照、
 * 規模 (AUM)、產業分布，並計算交集重疊標記。
 *
 * Cache: 1 小時重新驗證
 */
export const revalidate = 3600;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedDate = searchParams.get('date');

        const supabase = await createClient();

        // 1. 決定目標日期
        let targetDate = requestedDate;
        if (!targetDate) {
            // 取各 ETF 最新日期的交集（或最新可用日期）
            const { data: dateRows } = await supabase
                .from('etf_holdings_snapshot')
                .select('data_date')
                .in('etf_code', ETF_CODES as unknown as string[])
                .order('data_date', { ascending: false })
                .limit(1);
            targetDate = dateRows?.[0]?.data_date ?? null;
        }

        if (!targetDate) {
            return NextResponse.json({ error: 'No data available' }, { status: 404 });
        }

        // 2. 批次查詢持股（三 ETF 一次撈）
        const { data: allHoldings } = await supabase
            .from('etf_holdings_snapshot')
            .select('etf_code, stock_code, stock_name, weight, data_date')
            .in('etf_code', ETF_CODES as unknown as string[])
            .eq('data_date', targetDate)
            .order('weight', { ascending: false });

        // 3. 查詢 AUM（最新日期）
        const { data: aumRows } = await supabase
            .from('etf_aum')
            .select('etf_code, aum_100m_twd, snapshot_date')
            .in('etf_code', ETF_CODES as unknown as string[])
            .order('snapshot_date', { ascending: false })
            .limit(ETF_CODES.length * 3);  // 取最近幾筆，後面取最新

        // 4. 查詢產業分布
        const { data: sectorRows } = await supabase
            .from('etf_sectors')
            .select('etf_code, sector_name, weight, snapshot_date')
            .in('etf_code', ETF_CODES as unknown as string[])
            .order('snapshot_date', { ascending: false })
            .limit(ETF_CODES.length * 30);

        // 5. 建立交集 map：stock_code → 持有它的 ETF 清單
        const stockEtfMap: Record<string, string[]> = {};
        for (const h of allHoldings ?? []) {
            if (!stockEtfMap[h.stock_code]) stockEtfMap[h.stock_code] = [];
            if (!stockEtfMap[h.stock_code].includes(h.etf_code)) {
                stockEtfMap[h.stock_code].push(h.etf_code);
            }
        }

        // 6. 組裝每支 ETF 的回傳資料
        const result: EtfCompareData[] = ETF_CODES.map((etf_code) => {
            const holdings = (allHoldings ?? [])
                .filter(h => h.etf_code === etf_code)
                .map((h, idx) => ({
                    stock_code: h.stock_code,
                    stock_name: h.stock_name,
                    weight: h.weight ?? 0,
                    rank: idx + 1,
                    in_etfs: stockEtfMap[h.stock_code] ?? [etf_code],
                }));

            // 取最新 AUM
            const latestAum = (aumRows ?? [])
                .filter(a => a.etf_code === etf_code)
                .sort((a, b) =>
                    new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
                )[0];

            // 取最新產業（取最近一天的）
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
                ...ETF_META[etf_code],
                data_date: targetDate,
                holdings,
                aum_100m_twd: latestAum?.aum_100m_twd ?? null,
                sectors,
            };
        });

        return NextResponse.json({
            date: targetDate,
            etfs: result,
            // 便利欄位：交集股票清單
            overlap: {
                all3: Object.entries(stockEtfMap)
                    .filter(([, etfs]) => etfs.length === 3)
                    .map(([code]) => code),
                any2: Object.entries(stockEtfMap)
                    .filter(([, etfs]) => etfs.length === 2)
                    .map(([code]) => code),
            },
        });
    } catch (err) {
        console.error('etf-compare API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
