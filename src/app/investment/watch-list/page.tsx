import { createClient } from '@/lib/supabase/server';
import { WatchListManager } from '@/components/features/investment/WatchListManager';

export default async function WatchListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 未登入者看到空清單
    const watchList = user
        ? (await supabase
              .from('watch_list')
              .select('id, stock_id, name, strategies, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: true })).data
        : null;

    // 補填名稱為空的項目
    const missing = (watchList ?? []).filter((w) => !w.name);
    if (missing.length > 0) {
        const codes = missing.map((w) => w.stock_id);

        const [{ data: basicData }, { data: etfData }, { data: bareKData }] = await Promise.all([
            supabase.from('stock_basic_info').select('stock_code, name_short').in('stock_code', codes),
            supabase.from('etf_holdings_snapshot').select('stock_code, stock_name').in('stock_code', codes),
            supabase.from('bare_k_snapshots').select('stock_id, summary').in('stock_id', codes).order('date', { ascending: false }),
        ]);

        const nameMap = new Map<string, string>();
        // 優先序：basicData > etfData > bare_k_snapshots
        const bareKSeen = new Set<string>();
        bareKData?.forEach((r) => {
            if (!bareKSeen.has(r.stock_id) && (r.summary as Record<string, unknown>)?.['name']) {
                nameMap.set(r.stock_id, (r.summary as Record<string, string>)['name']);
                bareKSeen.add(r.stock_id);
            }
        });
        etfData?.forEach((r) => { if (r.stock_name) nameMap.set(r.stock_code, r.stock_name); });
        basicData?.forEach((r) => { if (r.name_short) nameMap.set(r.stock_code, r.name_short); });

        await Promise.all(
            missing
                .filter((w) => nameMap.has(w.stock_id))
                .map((w) =>
                    supabase.from('watch_list').update({ name: nameMap.get(w.stock_id) }).eq('id', w.id)
                )
        );

        missing.forEach((w) => {
            if (nameMap.has(w.stock_id)) w.name = nameMap.get(w.stock_id)!;
        });
    }

    return (
        <div className="min-h-screen p-6 animate-fade-in">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">自選股管理</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        新增您想追蹤的股票，每日台灣時間 22:00 自動更新裸K快照
                    </p>
                </div>
                <WatchListManager initialList={watchList ?? []} />
            </div>
        </div>
    );
}
