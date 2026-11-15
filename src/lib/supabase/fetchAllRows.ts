/** Supabase PostgREST 單次回應上限 1000 列（超過靜默丟棄），故一律以 range 分頁讀完。 */
export const PAGE_SIZE = 1000;

export interface PageResponse {
    data: unknown[] | null;
    error: { message: string } | null;
}

/**
 * 逐頁讀完一個查詢，直到某頁列數不足 PAGE_SIZE。
 *
 * 呼叫端的查詢必須有穩定排序（唯一鍵組合），否則跨頁可能重複或漏列。
 * 任何一頁失敗就丟出帶 label 的 Error，不回傳部分結果。
 *
 * @param label 錯誤訊息中的資料表名稱
 * @param fetchPage 依 `[from, to]`（含）範圍讀取一頁
 */
export async function fetchAllRows<T>(
    label: string,
    fetchPage: (from: number, to: number) => PromiseLike<PageResponse>,
): Promise<T[]> {
    const all: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(`${label}: ${error.message}`);
        const rows = (data ?? []) as T[];
        all.push(...rows);
        if (rows.length < PAGE_SIZE) break;
    }
    return all;
}
