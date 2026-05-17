export type EtfSectorActivityMap = Record<string, {
    etf_codes: string[];                          // sector-level: all ETFs buying in this category
    stock_codes: string[];                        // for sort counting
    stock_etf_map: Record<string, string[]>;      // stock_id → ETF codes that bought it
}>;

export type DiffLogRow = {
    stock_code: string;
    etf_code: string;
    diff_weight: number;
    change_type: string;
};

// Pure function exported for testing. Filters and groups diff logs by sector category.
export function buildEtfSectorActivityMap(
    stockToCategory: Map<string, string>,
    diffLogs: DiffLogRow[],
): EtfSectorActivityMap {
    const acc: Record<string, {
        etf_codes: Set<string>;
        stock_codes: Set<string>;
        stock_etf_map: Record<string, Set<string>>;
    }> = {};

    for (const row of diffLogs) {
        const category = stockToCategory.get(row.stock_code);
        if (!category) continue;

        if (!acc[category]) {
            acc[category] = { etf_codes: new Set(), stock_codes: new Set(), stock_etf_map: {} };
        }
        acc[category].etf_codes.add(row.etf_code);
        acc[category].stock_codes.add(row.stock_code);
        if (!acc[category].stock_etf_map[row.stock_code]) {
            acc[category].stock_etf_map[row.stock_code] = new Set();
        }
        acc[category].stock_etf_map[row.stock_code].add(row.etf_code);
    }

    const result: EtfSectorActivityMap = {};
    for (const [cat, { etf_codes, stock_codes, stock_etf_map }] of Object.entries(acc)) {
        result[cat] = {
            etf_codes: Array.from(etf_codes),
            stock_codes: Array.from(stock_codes),
            stock_etf_map: Object.fromEntries(
                Object.entries(stock_etf_map).map(([k, v]) => [k, Array.from(v)]),
            ),
        };
    }
    return result;
}
