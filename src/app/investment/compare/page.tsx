import { createClient } from '@/lib/supabase/server';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import { EtfComparePanel } from '@/components/features/investment/EtfComparePanel';

const ETF_CODES = ETF_REGISTRY.map(e => e.code);
const ETF_META = Object.fromEntries(
    ETF_REGISTRY.map(e => [e.code, { name: e.name, manager: e.manager, color: e.color }])
);

async function getCompareData() {
    const supabase = await createClient();

    // 取最新可用日期
    const { data: dateRow } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .in('etf_code', ETF_CODES)
        .order('data_date', { ascending: false })
        .limit(1);

    const targetDate = dateRow?.[0]?.data_date ?? null;
    if (!targetDate) return null;

    // 批次查詢持股
    const { data: allHoldings } = await supabase
        .from('etf_holdings_snapshot')
        .select('etf_code, stock_code, stock_name, weight, data_date')
        .in('etf_code', ETF_CODES)
        .eq('data_date', targetDate)
        .order('weight', { ascending: false });

    // 只取當天有資料的 ETF
    const activeCodes = [...new Set((allHoldings ?? []).map(h => h.etf_code))];

    // AUM
    const { data: aumRows } = await supabase
        .from('etf_aum')
        .select('etf_code, aum_100m_twd, snapshot_date')
        .in('etf_code', activeCodes)
        .order('snapshot_date', { ascending: false })
        .limit(activeCodes.length * 3);

    // 產業分布
    const { data: sectorRows } = await supabase
        .from('etf_sectors')
        .select('etf_code, sector_name, weight, snapshot_date')
        .in('etf_code', activeCodes)
        .order('snapshot_date', { ascending: false })
        .limit(activeCodes.length * 30);

    // 交集 map：stock_code → 持有它的 ETF 清單
    const stockEtfMap: Record<string, string[]> = {};
    for (const h of allHoldings ?? []) {
        if (!stockEtfMap[h.stock_code]) stockEtfMap[h.stock_code] = [];
        if (!stockEtfMap[h.stock_code].includes(h.etf_code)) {
            stockEtfMap[h.stock_code].push(h.etf_code);
        }
    }

    const etfs = activeCodes.map((etf_code) => {
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

    // byCount[n] = 恰好被 n 支 ETF 持有的股票代號清單（n >= 2）
    const byCount: Record<number, string[]> = {};
    for (const [code, etfList] of Object.entries(stockEtfMap)) {
        const n = etfList.length;
        if (n >= 2) {
            if (!byCount[n]) byCount[n] = [];
            byCount[n].push(code);
        }
    }

    return { etfs, overlap: { byCount, totalEtfs: activeCodes.length }, date: targetDate };
}

export default async function EtfComparePage() {
    const data = await getCompareData();

    const displayDate = data?.date
        ? new Date(data.date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
        : 'N/A';

    const etfCount = data?.etfs.length ?? 0;

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        主動 ETF 對比分析
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {etfCount} 支主動 ETF 持股交集與產業分布
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    資料日期: {displayDate}
                </div>
            </div>

            {data ? (
                <EtfComparePanel etfs={data.etfs} overlap={data.overlap} />
            ) : (
                <div className="glass-card rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-lg">暫無資料</p>
                    <p className="text-sm mt-2">系統每日 22:00 自動更新，首次啟用後資料將於下次執行後顯示</p>
                </div>
            )}
        </div>
    );
}
