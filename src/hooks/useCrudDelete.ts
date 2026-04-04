import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

interface UseCrudDeleteOptions {
    /** 要刪除的 table 名稱 */
    table: string;
    /** confirm 對話框訊息，預設「確定要刪除嗎？」 */
    confirmMessage?: string;
    /** 刪除成功後呼叫（通常傳入 refetch） */
    onSuccess?: () => void | Promise<void>;
    /** 刪除失敗時顯示的 toast 前綴，預設「刪除失敗」 */
    errorPrefix?: string;
}

interface UseCrudDeleteResult {
    deleting: boolean;
    handleDelete: (id: string) => Promise<void>;
}

/**
 * 統一 CRUD 刪除樣板：confirm → supabase.delete → toast.error / onSuccess。
 *
 * @example
 * const { handleDelete } = useCrudDelete({
 *   table: 'contract_clauses',
 *   confirmMessage: '確定要刪除這條常用條文嗎？',
 *   onSuccess: refetch,
 * });
 */
export function useCrudDelete({
    table,
    confirmMessage = '確定要刪除嗎？',
    onSuccess,
    errorPrefix = '刪除失敗',
}: UseCrudDeleteOptions): UseCrudDeleteResult {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm(confirmMessage)) return;

        setDeleting(true);
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            await onSuccess?.();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '未知錯誤';
            toast.error(`${errorPrefix}：${msg}`);
        } finally {
            setDeleting(false);
        }
    };

    return { deleting, handleDelete };
}
