import { createClient } from '@/lib/supabase/server';
import { ClockIcon } from 'lucide-react';
import { HoldingsTable } from '@/components/features/investment/HoldingsTable';
import { DiffLedger } from '@/components/features/investment/DiffLedger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Assuming shadcn/ui tabs exist
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Fetch data on server
async function getHoldings() {
    const supabase = await createClient();
    
    // First, get the latest available date
    const { data: latestDateData } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1);
    
    const latestDate = latestDateData?.[0]?.data_date;
    if (!latestDate) return [];

    const { data } = await supabase
        .from('etf_holdings_snapshot')
        .select('*')
        .eq('etf_code', '00981A')
        .eq('data_date', latestDate)
        .order('weight', { ascending: false });
    return data || [];
}

async function getDiffLogs() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('etf_diff_logs')
        .select('*')
        .eq('etf_code', '00981A')
        .order('data_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50); // Recent activity
    return data || [];
}

export default async function InvestmentPage() {
    const holdings = await getHoldings();
    const logs = await getDiffLogs();
    
    // Calculate stats
    const totalShares = holdings.reduce((sum, item) => sum + item.shares, 0);
    const dataDate = holdings.length > 0 ? holdings[0].data_date : 'N/A';

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        00981A 投資監控
                    </h1>
                    <p className="text-slate-500 mt-1">
                        主動統一台股增長 • 即時追蹤持股異動與投資策略
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    最新數據: {dataDate}
                </div>
            </div>

            {/* Holdings Table Section */}
            <Tabs defaultValue="holdings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <TabsTrigger value="holdings" className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">持股明細</TabsTrigger>
                    <TabsTrigger value="ledger" className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">異動紀錄</TabsTrigger>
                </TabsList>

                <TabsContent value="holdings">
                    <div className="w-full">
                        <HoldingsTable initialData={holdings} />
                    </div>
                </TabsContent>
                <TabsContent value="ledger">
                    <div className="w-full">
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
