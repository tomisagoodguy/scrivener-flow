import { createClient } from '@/lib/supabase/server';
import { ClockIcon, TrendingUpIcon } from 'lucide-react';
import Link from 'next/link';
import { HoldingsTable } from '@/components/features/investment/HoldingsTable';
import { DiffLedger } from '@/components/features/investment/DiffLedger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Assuming shadcn/ui tabs exist
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HoldingsOverview } from '@/components/features/investment/HoldingsOverview';
import { RankingTrendChart } from '@/components/features/investment/RankingTrendChart';
import { ChangeImpactChart } from '@/components/features/investment/ChangeImpactChart';
import { GoldenGrowthZone } from '@/components/features/investment/GoldenGrowthZone';

// Fetch data on server
async function getHoldings() {
    const supabase = await createClient();
    
    // First, get the latest 2 available dates to check data integrity
    const { data: dateCandidates } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, updated_at')
        .order('data_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(2); // Fetch top 2
    
    if (!dateCandidates || dateCandidates.length === 0) return { holdings: [], updatedAt: null, dataDate: null };

    // Helper to fetch holdings for a specific date
    const fetchHoldingsForDate = async (date: string) => {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', '00981A')
            .eq('data_date', date)
            .order('weight', { ascending: false });
        return data || [];
    };

    // 1. Try latest date
    let targetDate = dateCandidates[0].data_date;
    let targetUpdatedAt = dateCandidates[0].updated_at;
    let data = await fetchHoldingsForDate(targetDate);

    // 2. Integrity Check: If majority of prices are 0 or null, fallback to previous date
    // (Assuming valid data should have non-zero prices for most stocks)
    const validPriceCount = data.filter(h => h.price && h.price > 0).length;
    const totalCount = data.length;
    const isValid = totalCount > 0 && (validPriceCount / totalCount) > 0.5; // Threshold: 50% valid prices

    if (!isValid && dateCandidates.length > 1) {
        console.log(`⚠️ Snapshot for ${targetDate} seems incomplete (Valid Prices: ${validPriceCount}/${totalCount}). Falling back to ${dateCandidates[1].data_date}`);
        targetDate = dateCandidates[1].data_date;
        targetUpdatedAt = dateCandidates[1].updated_at;
        data = await fetchHoldingsForDate(targetDate);
    }

    // Fetch industry info
    const { data: industryData } = await supabase
        .from('stock_basic_info')
        .select('stock_code, industry')
        .in('stock_code', (data || []).map(h => h.stock_code));
    
    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => {
        industryMap[i.stock_code] = i.industry;
    });

    // Fetch latest revenue data (including YoY, MoM)
    const { data: revData } = await supabase
        .from('stock_revenue_monthly')
        .select('stock_code, data_date, revenue_yoy, revenue_mom')
        .in('stock_code', (data || []).map(h => h.stock_code))
        .order('data_date', { ascending: false });

    // Map: Code -> { date, yoy, mom }
    const revMap: Record<string, { date: string, yoy: number, mom: number }> = {};
    
    // Iterate and pick the first (latest) one for each code
    revData?.forEach(r => {
        if (!revMap[r.stock_code]) {
            revMap[r.stock_code] = {
                date: r.data_date.substring(0, 7),
                yoy: r.revenue_yoy,
                mom: r.revenue_mom
            };
        }
    });

    const formattedHoldings = (data || []).map(h => {
        const revInfo = revMap[h.stock_code];
        return {
            ...h,
            industry: industryMap[h.stock_code] || '未知',
            revenue_month: revInfo?.date || null,
            revenue_yoy: revInfo?.yoy ?? null,
            revenue_mom: revInfo?.mom ?? null
        };
    });

    return {
        holdings: formattedHoldings,
        updatedAt: targetUpdatedAt,
        dataDate: targetDate
    };
}

async function getRankingHistory() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, stock_name, weight')
        .eq('etf_code', '00981A')
        .order('data_date', { ascending: true });
    
    if (!data || data.length === 0) return [];
    
    return data;
}

async function getDiffLogs() {
    const supabase = await createClient();
    
    // 1. Fetch logs
    const { data: logsData } = await supabase
        .from('etf_diff_logs')
        .select('*')
        .eq('etf_code', '00981A')
        .order('data_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
    
    if (!logsData) return [];

    // 2. Fetch all snapshot data for these dates to calculate rank
    const uniqueDates = [...new Set(logsData.map(l => l.data_date))];
    const { data: snapshotData } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, weight')
        .in('data_date', uniqueDates)
        .eq('etf_code', '00981A');

    // 3. Build ranking map: { date: { stock_code: rank } }
    const dateRankMap: Record<string, Record<string, number>> = {};
    uniqueDates.forEach(date => {
        const dayHoldings = (snapshotData || [])
            .filter(s => s.data_date === date)
            .sort((a, b) => (b.weight || 0) - (a.weight || 0));
        
        dateRankMap[date] = {};
        dayHoldings.forEach((h, index) => {
            dateRankMap[date][h.stock_code] = index + 1;
        });
    });

    // 4. Fetch industry info
    const { data: industryData } = await supabase
        .from('stock_basic_info')
        .select('stock_code, industry')
        .in('stock_code', logsData.map(l => l.stock_code));
    
    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => {
        industryMap[i.stock_code] = i.industry;
    });

    return logsData.map(l => ({
        ...l,
        industry: industryMap[l.stock_code] || null,
        rank: dateRankMap[l.data_date]?.[l.stock_code] || null
    }));
}

export default async function InvestmentPage() {
    const { holdings, updatedAt, dataDate } = await getHoldings();
    const logs = await getDiffLogs();
    const rankingHistory = await getRankingHistory();
    
    // 顯示最新的資料日期
    const displayDate = dataDate ? new Date(dataDate).toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
    }) : 'N/A';

    const updateTime = updatedAt ? new Date(updatedAt).toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) : '';

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        00981A 投資監控
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        主動統一台股增長 • 即時追蹤持股異動與投資策略
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        資料日期: {displayDate} <span className="text-slate-400 dark:text-slate-300 text-xs ml-1">({updateTime})</span>
                    </div>
                </div>
            </div>

            {/* Holdings Table Section */}
            <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <TabsTrigger value="analysis" className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">策略洞察</TabsTrigger>
                    <TabsTrigger value="holdings" className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">持股明細</TabsTrigger>
                    <TabsTrigger value="ledger" className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">異動紀錄</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis">
                    <GoldenGrowthZone data={holdings} />
                </TabsContent>

                <TabsContent value="holdings">
                    <div className="w-full space-y-6">
                        <HoldingsOverview data={holdings} />
                        <HoldingsTable initialData={holdings} />
                    </div>
                </TabsContent>
                <TabsContent value="ledger">
                    <div className="w-full space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RankingTrendChart data={rankingHistory} />
                            <ChangeImpactChart logs={logs} />
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-indigo-500" />
                                近期異動紀錄
                            </h3>
                        </div>
                        <DiffLedger logs={logs} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
