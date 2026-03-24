'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/client';

// 處理 Supabase implicit flow Magic Link（#access_token=xxx 在 URL hash 中）
// Server 端 Route Handler 看不到 hash，由此 Client Component 接手
export default function AuthConfirmPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const handleAuth = async () => {
            // @supabase/ssr 的 createBrowserClient 會自動偵測 URL hash 中的 token
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/');
            } else {
                // 等待 onAuthStateChange 觸發（hash token 尚未解析完成）
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        subscription.unsubscribe();
                        router.replace('/');
                    } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
                        subscription.unsubscribe();
                        router.replace('/login?error=auth-code-error');
                    }
                });
                // Timeout fallback
                setTimeout(() => {
                    subscription.unsubscribe();
                    router.replace('/login?error=auth-code-error');
                }, 5000);
            }
        };
        handleAuth();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm font-bold text-slate-400 animate-pulse">驗證身分中...</span>
            </div>
        </div>
    );
}
