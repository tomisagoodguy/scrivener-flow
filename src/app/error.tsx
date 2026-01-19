'use client';

import { useEffect } from 'react';

// Error components must be Client Components
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full p-8 text-center space-y-6 border border-red-500/20 shadow-2xl rounded-2xl animate-shake">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full" />
                    <div className="relative text-6xl select-none">
                        ⚠️
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">
                        系統發生錯誤
                    </h2>
                    <p className="text-foreground/60 font-medium text-sm">
                        抱歉，處理您的請求時發生了預期外的問題。
                        <br />
                        如果情況持續，請聯繫管理員。
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/25"
                    >
                        重試 (Retry)
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full px-6 py-3 rounded-full bg-secondary/50 text-foreground font-bold hover:bg-secondary transition-all hover:scale-[1.02]"
                    >
                        返回首頁
                    </button>
                </div>
            </div>
        </div>
    );
}
