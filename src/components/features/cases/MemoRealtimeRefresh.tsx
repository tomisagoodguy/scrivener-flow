'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MemoRealtimeRefresh() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel('memo-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => {
                router.refresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
                router.refresh();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'todos' }, () => {
                router.refresh();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [router, supabase]);

    return null;
}
