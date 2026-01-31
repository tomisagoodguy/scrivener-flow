import { createClient } from '@/lib/supabase/server';
import { HoldingsTable } from '@/components/features/investment/HoldingsTable';
import { DiffLedger } from '@/components/features/investment/DiffLedger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Assuming shadcn/ui tabs exist
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Fetch data on server
async function getHoldings() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('etf_holdings_snapshot')
        .select('*')
        .eq('etf_code', '00981A')
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

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>總持股數</CardDescription>
                        <CardTitle className="text-2xl font-mono">
                            {holdings.length} 檔
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>持有總股數</CardDescription>
                        <CardTitle className="text-2xl font-mono">
                            {(totalShares / 1000).toLocaleString()} <span className="text-sm font-normal text-slate-500">張</span>
                        </CardTitle>
                    </CardHeader>
                </Card>
                 <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>最大持股</CardDescription>
                        <CardTitle className="text-2xl truncate">
                            {holdings.length > 0 ? holdings[0].stock_name : '-'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="holdings" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="holdings">最新持股明細</TabsTrigger>
                    <TabsTrigger value="ledger">異動流水帳</TabsTrigger>
                </TabsList>
                
                <TabsContent value="holdings">
                    <HoldingsTable initialData={holdings} />
                </TabsContent>
                
                <TabsContent value="ledger">
                    <div className="max-w-3xl">
                        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">近期異動紀錄</h3>
                        <DiffLedger logs={logs} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
