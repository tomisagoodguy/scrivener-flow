import { toast } from 'sonner';

interface NotificationOptions {
    /** toast 持續時間（ms），預設使用 sonner 預設值 */
    duration?: number;
}

/**
 * 統一 toast 通知格式，避免各元件直接呼叫 sonner 造成格式不一致。
 *
 * @example
 * const notify = useNotification();
 * notify.success('儲存成功');
 * notify.error('儲存失敗', error);
 * notify.loading('上傳中...');
 */
export function useNotification(defaults?: NotificationOptions) {
    const opts = { duration: defaults?.duration };

    return {
        success: (message: string) =>
            toast.success(message, opts),

        error: (message: string, err?: unknown) => {
            const detail = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
            toast.error(detail ? `${message}：${detail}` : message, opts);
        },

        info: (message: string) =>
            toast.info(message, opts),

        warning: (message: string) =>
            toast.warning(message, opts),

        loading: (message: string) =>
            toast.loading(message, opts),

        dismiss: toast.dismiss,
    };
}
