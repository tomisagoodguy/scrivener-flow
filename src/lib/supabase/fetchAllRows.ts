/** Supabase PostgREST 單次回應上限 1000 列（超過靜默丟棄），故一律以 range 分頁讀完。 */
export const PAGE_SIZE = 1000;

export interface PageResponse {
    data: unknown[] | null;
    error: { message: string } | null;
}

export interface FetchAllRowsOptions {
    /** 每批同時請求的頁數，預設 1（依序）；小於 1 視為 1 */
    concurrency?: number;
}

/**
 * 分頁讀完一個查詢，直到依範圍順序第一個列數不足 PAGE_SIZE 的頁。
 *
 * 每批同時請求 `concurrency` 個連續範圍；整批都滿頁才送下一批，
 * 第一個不足一頁之後的頁（必為空）丟棄。結果依範圍順序合併。
 * 呼叫端的查詢必須有穩定排序（唯一鍵組合），否則跨頁可能重複或漏列。
 * 任何一頁失敗就丟出帶 label 的 Error，不回傳部分結果。
 *
 * @param label 錯誤訊息中的資料表名稱
 * @param fetchPage 依 `[from, to]`（含）範圍讀取一頁
 * @param options 並行設定
 */
export async function fetchAllRows<T>(
    label: string,
    fetchPage: (from: number, to: number) => PromiseLike<PageResponse>,
    options: FetchAllRowsOptions = {},
): Promise<T[]> {
    const concurrency = Math.max(1, Math.floor(options.concurrency ?? 1));
    const all: T[] = [];
    for (let batchStart = 0; ; batchStart += concurrency * PAGE_SIZE) {
        const pages = await Promise.all(
            Array.from({ length: concurrency }, (_, i) => {
                const from = batchStart + i * PAGE_SIZE;
                return Promise.resolve(fetchPage(from, from + PAGE_SIZE - 1));
            }),
        );
        for (const { error } of pages) {
            if (error) throw new Error(`${label}: ${error.message}`);
        }
        for (const { data } of pages) {
            const rows = (data ?? []) as T[];
            all.push(...rows);
            if (rows.length < PAGE_SIZE) return all;
        }
    }
}
