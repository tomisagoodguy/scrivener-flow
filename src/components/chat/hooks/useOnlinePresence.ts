'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

/** 全站共用一個 presence channel，回傳目前在線的使用者 id 集合。 */
export function useOnlinePresence(currentUserId: string | null) {
    const supabase = useMemo(() => createClient(), []);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!currentUserId) return undefined;

        const channel = supabase.channel('chat-online-presence', {
            config: { presence: { key: currentUserId } },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, supabase]);

    return onlineUserIds;
}
