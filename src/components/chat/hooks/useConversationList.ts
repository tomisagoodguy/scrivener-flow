'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isConversationHidden } from '@/lib/chat/chatService';
import type { Conversation } from '@/types/chat';

export interface ConversationListItem extends Conversation {
    lastMessageAt: string | null;
    memberIds: string[];
}

export function useConversationList(currentUserId: string | null) {
    const supabase = useMemo(() => createClient(), []);
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!currentUserId) {
            setConversations([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        const { data: myMemberships, error: memberError } = await supabase
            .from('conversation_members')
            .select('conversation_id, hidden_at')
            .eq('user_id', currentUserId);

        if (memberError) {
            console.error('取得對話清單失敗:', memberError.message);
            setLoading(false);
            return;
        }

        const ids = (myMemberships ?? []).map((m) => m.conversation_id);
        if (ids.length === 0) {
            setConversations([]);
            setLoading(false);
            return;
        }

        const hiddenAtByConversation = new Map<string, string | null>(
            (myMemberships ?? []).map((m) => [m.conversation_id, m.hidden_at])
        );

        const [{ data: convs, error: convError }, { data: allMembers, error: allMembersError }] = await Promise.all([
            supabase.from('conversations').select('*').in('id', ids),
            supabase.from('conversation_members').select('conversation_id, user_id').in('conversation_id', ids),
        ]);

        if (convError || allMembersError) {
            console.error('取得對話資料失敗:', (convError ?? allMembersError)?.message);
            setLoading(false);
            return;
        }

        const membersByConversation = new Map<string, string[]>();
        for (const m of allMembers ?? []) {
            const list = membersByConversation.get(m.conversation_id) ?? [];
            list.push(m.user_id);
            membersByConversation.set(m.conversation_id, list);
        }

        const withDetails = await Promise.all(
            (convs ?? []).map(async (conv) => {
                const { data: latest } = await supabase
                    .from('messages')
                    .select('created_at')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return {
                    ...conv,
                    lastMessageAt: latest?.created_at ?? null,
                    memberIds: membersByConversation.get(conv.id) ?? [],
                };
            })
        );

        const visible = withDetails.filter(
            (conv) => !isConversationHidden(hiddenAtByConversation.get(conv.id) ?? null, conv.lastMessageAt, conv.created_at)
        );

        visible.sort((a, b) => {
            const at = a.lastMessageAt ?? a.created_at;
            const bt = b.lastMessageAt ?? b.created_at;
            return new Date(bt).getTime() - new Date(at).getTime();
        });

        setConversations(visible);
        setLoading(false);
    }, [currentUserId, supabase]);

    useEffect(() => {
        if (!currentUserId) return undefined;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        refresh();

        const channel = supabase
            .channel('chat-conversation-list-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, () => refresh())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, refresh, supabase]);

    return { conversations, loading, refresh };
}
