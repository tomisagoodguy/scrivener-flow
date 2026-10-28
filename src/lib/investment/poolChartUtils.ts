import type { Holding } from '@/types/investment';

export interface PoolChartRow {
    code: string;
    name: string;
    /** 持有此股的 ETF 代號，依 etfOrder 順序 */
    etfs: string[];
}

// 只收台股 4 碼代號：海外成分股（NVDA…）與 ETF 型成分（006208）無裸K資料
const TW_STOCK_CODE = /^\d{4}$/;

/**
 * 由各 ETF 最新持股組出選股池圖表清單：台股成分股聯集，
 * 依持有 ETF 數遞減、同數依代號遞增。
 */
export function buildPoolChartRows(byEtf: Record<string, Holding[]>, etfOrder: readonly string[]): PoolChartRow[] {
    const map = new Map<string, PoolChartRow>();
    for (const etf of etfOrder) {
        for (const h of byEtf[etf] ?? []) {
            if (!TW_STOCK_CODE.test(h.stock_code)) continue;
            const row = map.get(h.stock_code);
            if (!row) {
                map.set(h.stock_code, { code: h.stock_code, name: h.stock_name ?? '', etfs: [etf] });
            } else if (!row.etfs.includes(etf)) {
                row.etfs.push(etf);
                if (!row.name && h.stock_name) row.name = h.stock_name;
            }
        }
    }
    return Array.from(map.values()).sort(
        (a, b) => b.etfs.length - a.etfs.length || a.code.localeCompare(b.code),
    );
}
