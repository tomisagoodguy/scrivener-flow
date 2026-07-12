'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { sendMessage as sendMessageToDb, recallMessage as recallMessageInDb } from '@/lib/chat/chatService';
import type { ChatBroadcastPayload, ChatMessage } from '@/types/chat';

export interface ChatMessageWithStatus extends ChatMessage {
    status: 'sent' | 'failed';
}

export function useChatRealtime(conversationId: string | null, currentUserId: string | null) {
    const supabase = useMemo(() => createClient(), []);
    const [messages, setMessages] = useState<ChatMessageWithStatus[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!conversationId) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('取得聊天訊息失敗:', error);
            return;
        }

        setMessages((data ?? []).map((m) => ({ ...m, status: 'sent' as const })));
    }, [conversationId, supabase]);

    useEffect(() => {
        if (!conversationId) return undefined;

        // 訂閱新對話時載入歷史訊息，同 useTodoSync.ts 的 fetch-on-mount 慣例
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMessages();

        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on('broadcast', { event: 'new_message' }, ({ payload }) => {
                const data = payload as ChatBroadcastPayload;
                if (data.type !== 'new_message') return;
                setMessages((prev) => {
                    if (prev.some((m) => m.id === data.message.id)) return prev;
                    return [...prev, { ...data.message, status: 'sent' }];
                });
            })
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                () => fetchMessages()
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                () => fetchMessages()
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [conversationId, fetchMessages, supabase]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!conversationId || !currentUserId) return;
            const trimmed = content.trim();
            if (!trimmed) return;

            const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const optimistic: ChatMessageWithStatus = {
                id: tempId,
                conversation_id: conversationId,
                sender_id: currentUserId,
                content: trimmed,
                created_at: new Date().toISOString(),
                deleted_at: null,
                status: 'sent',
            };
            setMessages((prev) => [...prev, optimistic]);

            try {
                const saved = await sendMessageToDb(supabase, conversationId, currentUserId, trimmed);
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...saved, status: 'sent' } : m)));

                const payload: ChatBroadcastPayload = { type: 'new_message', message: saved };
                await channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload });
            } catch (err) {
                console.error('送出訊息失敗:', err instanceof Error ? err.message : err);
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
            }
        },
        [conversationId, currentUserId, supabase]
    );

    const recallMessage = useCallback(
        async (messageId: string) => {
            if (!currentUserId) return;
            const previous = messages;
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted_at: new Date().toISOString() } : m)));
            try {
                await recallMessageInDb(supabase, messageId, currentUserId);
            } catch (err) {
                console.error('收回訊息失敗:', err instanceof Error ? err.message : err);
                setMessages(previous);
            }
        },
        [currentUserId, messages, supabase]
    );

    const visibleMessages = conversationId ? messages : [];

    return { messages: visibleMessages, sendMessage, recallMessage };
}
