import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUpIcon, CalendarIcon } from 'lucide-react';
import Link from 'next/link';

interface StrategyHolding {
    stock_code: string;
    rank_position: number;
    close_price: number;
    revenue_yoy: number | null;
    revenue_mom: number | null;
    amount: number | null;
    natr: number | null;
    rs_rank: number | null;
    price_to_high_pct: number | null;
    data_date: string;
    stock_basic_info?: {
        name_short: string;
        industry: string;
    };
}

async function getStrategyHoldings() {
    const supabase = await createClient();
    
    // 取得最新日期的選股結果
    const { data: holdings } = await supabase
        .from('strategy_daily_holdings')
        .select(`
            *,
            stock_basic_info!inner(name_short, industry)
        `)
        .eq('strategy_code', 'low_vol_alpha_yoy')
        .order('data_date', { ascending: false })
        .limit(10);
    
    return holdings || [];
}

async function getStrategyChanges() {
    const supabase = await createClient();
    
    const { data: changes } = await supabase
        .from('strategy_changes_log')
        .select('*')
        .eq('strategy_code', 'low_vol_alpha_yoy')
        .order('data_date', { ascending: false })
        .limit(50);
    
    // Deduplicate changes based on unique key (date + stock + type)
    const uniqueMap = new Map();
    (changes || []).forEach(item => {
        const key = `${item.data_date}-${item.stock_code}-${item.change_type}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
        }
    });

    const uniqueChanges = Array.from(uniqueMap.values());

    // Fetch up-to-date names from stock_basic_info
    const stockCodes = uniqueChanges.map((c: any) => c.stock_code);
    if (stockCodes.length > 0) {
        const { data: stockInfos } = await supabase
            .from('stock_basic_info')
            .select('stock_code, name_short')
            .in('stock_code', stockCodes);
        
        const nameMap = new Map();
        stockInfos?.forEach((info) => {
            nameMap.set(info.stock_code, info.name_short);
        });

        // Update names in changes
        uniqueChanges.forEach((change: any) => {
            if (nameMap.has(change.stock_code)) {
                change.stock_name = nameMap.get(change.stock_code);
            }
        });
    }

    return uniqueChanges;
}

export default async function StrategyPage() {
    const holdings = await getStrategyHoldings();
    const changes = await getStrategyChanges();
    
    const latestDate = holdings[0]?.data_date || null;
    const displayDate = latestDate 
        ? new Date(latestDate).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
        : 'N/A';
    
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link 
                            href="/investment"
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm"
                        >
                            ← 返回投資監控
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        量化策略選股
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        低波動率營收成長策略 • 每月 10 號更新
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                    <CalendarIcon className="w-4 h-4" />
                    選股日期: {displayDate}
                </div>
            </div>
            
            <Tabs defaultValue="holdings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <TabsTrigger value="holdings" className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                        持股明細
                    </TabsTrigger>
                    <TabsTrigger value="changes" className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                        異動紀錄
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="holdings">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUpIcon className="w-5 h-5 text-indigo-500" />
                                本月精選 Top 10
                            </CardTitle>
                            <CardDescription>
                                基於營收成長、低波動與技術面篩選的量化選股策略
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent>
                            {holdings.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    暫無選股資料
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {holdings.map((holding) => (
                                        <Link
                                            key={holding.stock_code}
                                            href={`/investment/dashboard/${holding.stock_code}`}
                                            className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 text-white font-bold text-sm">
                                                    {holding.rank_position}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {holding.stock_code}
                                                    </div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                                        {holding.stock_basic_info?.name_short || ''}
                                                    </div>
                                                    <div className="text-xs text-slate-400 dark:text-slate-500">
                                                        {holding.stock_basic_info?.industry || ''}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div className="text-right">
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">股價</div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        ${holding.close_price.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">營收YoY</div>
                                                    <div className={`font-semibold ${
                                                        holding.revenue_yoy && holding.revenue_yoy > 0 
                                                            ? 'text-red-600 dark:text-red-400' 
                                                            : 'text-green-600 dark:text-green-400'
                                                    }`}>
                                                        {holding.revenue_yoy ? `${holding.revenue_yoy.toFixed(1)}%` : 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">成交額</div>
                                                    <div className="text-slate-700 dark:text-slate-300">
                                                        {holding.amount ? `${(holding.amount / 100000000).toFixed(2)}億` : 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">距高點</div>
                                                    <div className={`font-semibold ${
                                                        holding.price_to_high_pct && holding.price_to_high_pct > -10
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {holding.price_to_high_pct ? `${holding.price_to_high_pct.toFixed(1)}%` : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="changes">
                    <Card>
                        <CardHeader>
                            <CardTitle>近期異動紀錄</CardTitle>
                            <CardDescription>追蹤策略選股的 IN/OUT 異動</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {changes.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    暫無異動紀錄
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {changes.map((change, idx) => (
                                        <Link 
                                            key={idx} 
                                            href={`/investment/dashboard/${change.stock_code}`}
                                            className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge variant={change.change_type === 'IN' ? 'default' : 'destructive'}>
                                                    {change.change_type === 'IN' ? '🆕 新進' : '❌ 移除'}
                                                </Badge>
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {change.stock_code} {change.stock_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {new Date(change.data_date).toLocaleDateString('zh-TW')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                                {change.change_type === 'IN' && change.new_rank && `排名: ${change.new_rank}`}
                                                {change.change_type === 'OUT' && change.prev_rank && `原排名: ${change.prev_rank}`}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
