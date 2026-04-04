import { useState } from 'react';

interface UseFormSubmitOptions {
    /** 實際執行的 async 操作 */
    onSubmit: () => Promise<void>;
    /** 成功後的 callback（例如跳轉、關閉 modal） */
    onSuccess?: () => void;
    /** 失敗後的 callback */
    onError?: (message: string) => void;
}

interface UseFormSubmitResult {
    loading: boolean;
    errorMsg: string;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    setErrorMsg: (msg: string) => void;
}

/**
 * 統一表單送出樣板：e.preventDefault + loading guard + try/catch + error 格式化。
 *
 * @example
 * const { loading, errorMsg, handleSubmit } = useFormSubmit({
 *   onSubmit: async () => { await saveData(formData); },
 *   onSuccess: () => router.push('/cases'),
 * });
 * // <form onSubmit={handleSubmit}>
 */
export function useFormSubmit({
    onSubmit,
    onSuccess,
    onError,
}: UseFormSubmitOptions): UseFormSubmitResult {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrorMsg('');

        try {
            await onSubmit();
            onSuccess?.();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '操作失敗，請稍後再試';
            setErrorMsg(msg);
            onError?.(msg);
        } finally {
            setLoading(false);
        }
    };

    return { loading, errorMsg, handleSubmit, setErrorMsg };
}
