import { createClient } from '@/lib/supabase/server';
import { ETF_CODES } from '@/lib/investment/etfRegistry';

/**
 * 純函式：給定 registry 順序的 codes 與「目前有持股列」的 code 集合，
 * 回傳有資料的子集，並保留 registry 原始順序。
 */
export function filterActiveEtfCodes(codes: string[], presentCodes: Iterable<string>): string[] {
    const present = new Set(presentCodes);
    return codes.filter(code => present.has(code));
}

/**
 * 「active ETF」的單一定義：目前有持股資料的 ETF（`etf_holdings_snapshot`
 * 至少有一列，等同 overview 的 `holdingsCount > 0`）。
 *
 * 由 runtime 資料動態推導，不維護任何硬編碼排除清單——當爬蟲修好、資料出現後，
 * 該 ETF 會自動重新被視為 active。
 *
 * 本函式僅供 listing / 導覽介面過濾使用，**不**更動 `ETF_REGISTRY` / `ETF_CODES`，
 * 兩者維持 registry 的單一事實來源；pipeline 仍對所有 code 嘗試爬取。
 *
 * 逐 ETF 以 head count 偵測存在性（與 `getEtfOverviewStats` 相同手法），
 * 避免 `.in()` 批次查詢被 PostgREST 1000 列上限靜默截斷而漏掉後段 code。
 */
export async function getActiveEtfCodes(): Promise<string[]> {
    const supabase = await createClient();

    const presence = await Promise.all(
        ETF_CODES.map(async etfCode => {
            const { count } = await supabase
                .from('etf_holdings_snapshot')
                .select('etf_code', { count: 'exact', head: true })
                .eq('etf_code', etfCode);
            return { etfCode, hasRows: (count ?? 0) > 0 };
        }),
    );

    return filterActiveEtfCodes(
        ETF_CODES,
        presence.filter(p => p.hasRows).map(p => p.etfCode),
    );
}
