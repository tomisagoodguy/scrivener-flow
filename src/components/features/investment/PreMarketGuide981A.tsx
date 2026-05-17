import { getServiceClient } from '@/lib/supabase/service';
import { PreMarketGuide981ACard, type Guide981AData } from './PreMarketGuide981ACard';
import { fetchSectorCategoryMap } from '@/lib/investment/sectorUtils';

// ── 型別 ──────────────────────────────────────────────────────────────────────

interface RawDiffLog {
    stock_code: string;
    stock_name: string;
    change_type: string;
    diff_shares: number;
    diff_weight: number;
    is_significant: boolean | null;
    curr_weight: number | null;
}

// ── 資料取得 ──────────────────────────────────────────────────────────────────

async function fetch981AData(): Promise<Guide981AData | null> {
    const supabase = getServiceClient();

    const { data: latestRaw } = await supabase
        .from('etf_diff_logs')
        .select('data_date')
        .eq('etf_code', '00981A')
        .order('data_date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRaw) return null;
    const date = (latestRaw as { data_date: string }).data_date;

    const [{ data: logsRaw }, { data: holdingsRaw }] = await Promise.all([
        supabase
            .from('etf_diff_logs')
            .select('stock_code,stock_name,change_type,diff_shares,diff_weight,is_significant,curr_weight')
            .eq('etf_code', '00981A')
            .eq('data_date', date),
        supabase
            .from('etf_holdings_snapshot')
            .select('stock_code,price')
            .eq('etf_code', '00981A')
            .eq('data_date', date),
    ]);

    const logs = logsRaw as RawDiffLog[] | null;
    const holdings = holdingsRaw as { stock_code: string; price: number | null }[] | null;

    const priceMap = new Map<string, number>(
        (holdings ?? [])
            .filter(h => h.price != null)
            .map(h => [h.stock_code, h.price as number])
    );

    const allCodes = [...new Set((logs ?? []).map(l => l.stock_code))];
    const sectorMap = await fetchSectorCategoryMap(allCodes);

    const toEntry = (log: RawDiffLog) => {
        const price = priceMap.get(log.stock_code) ?? null;
        const shares_張 = Math.round(Math.abs(log.diff_shares) / 1000);
        const amount_亿 = price != null
            ? Math.abs(log.diff_shares) * price / 1e8
            : null;
        return {
            stock_code: log.stock_code,
            stock_name: log.stock_name,
            change_type: log.change_type as 'IN' | 'OUT' | 'BUY' | 'SELL' | 'CLOSE',
            diff_shares: log.diff_shares,
            diff_weight: log.diff_weight,
            curr_weight: log.curr_weight,
            is_significant: log.is_significant,
            shares_張,
            amount_亿,
            sector: sectorMap[log.stock_code],
        };
    };

    const entries = (logs ?? [] as RawDiffLog[]).map(toEntry);

    const buys = entries
        .filter(e => e.change_type === 'BUY')
        .sort((a, b) => (b.amount_亿 ?? b.shares_張) - (a.amount_亿 ?? a.shares_張));

    const newIn = entries
        .filter(e => e.change_type === 'IN')
        .sort((a, b) => (b.amount_亿 ?? b.shares_張) - (a.amount_亿 ?? a.shares_張));

    const sells = entries
        .filter(e => e.change_type === 'SELL' || e.change_type === 'CLOSE')
        .sort((a, b) => (b.amount_亿 ?? b.shares_張) - (a.amount_亿 ?? a.shares_張));

    const exits = entries.filter(e => e.change_type === 'OUT');

    const month = new Date(date).getMonth() + 1;
    const day = new Date(date).getDate();

    return { displayDate: `${month}/${day}`, buys, newIn, sells, exits };
}

// ── Server Component ───────────────────────────────────────────────────────────

export async function PreMarketGuide981A() {
    const data = await fetch981AData();
    if (!data) return null;
    if (data.buys.length + data.newIn.length + data.sells.length + data.exits.length === 0) return null;
    return <PreMarketGuide981ACard data={data} />;
}
