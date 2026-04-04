import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface UseAuthUserResult {
    user: User | null;
    loading: boolean;
    requireUser: () => Promise<User>;
}

/**
 * 統一取得目前登入使用者。
 * - `user`：當前 session 的 User，未登入為 null（含 onAuthStateChange 即時同步）
 * - `loading`：初始化中為 true
 * - `requireUser`：在 async 操作中使用，未登入直接 throw Error('請先登入')
 */
export function useAuthUser(): UseAuthUserResult {
    const supabase = useMemo(() => createClient(), []);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_, session) => setUser(session?.user ?? null)
        );

        return () => subscription.unsubscribe();
    }, [supabase]);

    const requireUser = async (): Promise<User> => {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) throw new Error('請先登入');
        return data.user;
    };

    return { user, loading, requireUser };
}
