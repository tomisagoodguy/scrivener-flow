'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export function computeUnreadCount(lastReadAt: string, messages: { created_at: string }[]): number {
    const lastReadTime = new Date(lastReadAt).getTime();
    return messages.filter((m) => new Date(m.created_at).getTime() > lastReadTime).length;
}

export function sumUnreadCounts(unreadByConversation: Record<string, number>): number {
    return Object.values(unreadByConversation).reduce((sum, n) => sum + n, 0);
}

export function useUnreadCount(currentUserId: string | null) {
    const supabase = useMemo(() => createClient(), []);
    const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});

    const refresh = useCallback(async () => {
        if (!currentUserId) {
            setUnreadByConversation({});
            return;
        }

        const { data: memberships, error: memberError } = await supabase
            .from('conversation_members')
            .select('conversation_id, last_read_at')
            .eq('user_id', currentUserId);

        if (memberError) {
            console.error('取得對話成員資格失敗:', memberError.message);
            return;
        }

        const counts: Record<string, number> = {};
        for (const membership of memberships ?? []) {
            const { count, error: countError } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', membership.conversation_id)
                .gt('created_at', membership.last_read_at);

            if (countError) {
                console.error('計算未讀數失敗:', countError.message);
                continue;
            }

            counts[membership.conversation_id] = count ?? 0;
        }

        setUnreadByConversation(counts);
    }, [currentUserId, supabase]);

    useEffect(() => {
        if (!currentUserId) return undefined;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        refresh();

        const channel = supabase
            .channel('chat-unread-sync')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => refresh())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members' }, () => refresh())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, refresh, supabase]);

    const totalUnread = sumUnreadCounts(unreadByConversation);

    return { unreadByConversation, totalUnread, refresh };
}
