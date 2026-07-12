import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { ChatMessage, ChatUser, Conversation, ConversationMember } from '@/types/chat';

type Client = SupabaseClient<Database>;

/**
 * Supabase 拋出的是純物件 PostgrestError，不是 Error 實例；直接 `throw error`
 * 會讓呼叫端的 `err instanceof Error` guard 失效、吞掉真正的錯誤訊息。
 * 統一包成真正的 Error，讓 UI 層能顯示實際失敗原因而非通用文字。
 */
function toError(error: { message: string } | null, fallback: string): Error {
    return new Error(error?.message || fallback);
}

async function findExistingDirectConversation(
    supabase: Client,
    userA: string,
    userB: string
): Promise<Conversation | null> {
    const { data: mine, error } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userA);
    if (error) throw toError(error, '取得對話成員資料失敗');

    const myConversationIds = (mine ?? []).map((m) => m.conversation_id);
    if (myConversationIds.length === 0) return null;

    const { data: shared, error: sharedError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userB)
        .in('conversation_id', myConversationIds);
    if (sharedError) throw toError(sharedError, '取得對話成員資料失敗');

    const sharedIds = (shared ?? []).map((s) => s.conversation_id);
    if (sharedIds.length === 0) return null;

    const { data: directConversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', sharedIds)
        .eq('is_group', false)
        .limit(1)
        .maybeSingle();
    if (convError) throw toError(convError, '查詢既有對話失敗');

    return directConversation ?? null;
}

export async function findOrCreateDirectConversation(
    supabase: Client,
    currentUserId: string,
    otherUserId: string
): Promise<Conversation> {
    if (currentUserId === otherUserId) {
        throw new Error('不能與自己建立對話');
    }

    const existing = await findExistingDirectConversation(supabase, currentUserId, otherUserId);
    if (existing) return existing;

    const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({ is_group: false, created_by: currentUserId })
        .select()
        .single();

    if (error || !conversation) throw toError(error, '建立對話失敗');

    const { error: memberError } = await supabase.from('conversation_members').insert([
        { conversation_id: conversation.id, user_id: currentUserId },
        { conversation_id: conversation.id, user_id: otherUserId },
    ]);

    if (memberError) throw toError(memberError, '加入對話成員失敗');

    return conversation;
}

export async function createGroupConversation(
    supabase: Client,
    currentUserId: string,
    memberUserIds: string[],
    name: string
): Promise<Conversation> {
    if (memberUserIds.length < 1) {
        throw new Error('群組至少需要一位其他成員');
    }
    if (!name.trim()) {
        throw new Error('群組名稱不可為空');
    }

    const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({ is_group: true, name, created_by: currentUserId })
        .select()
        .single();

    if (error || !conversation) throw toError(error, '建立群組失敗');

    const uniqueMemberIds = Array.from(new Set([currentUserId, ...memberUserIds]));
    const { error: memberError } = await supabase
        .from('conversation_members')
        .insert(uniqueMemberIds.map((userId) => ({ conversation_id: conversation.id, user_id: userId })));

    if (memberError) throw toError(memberError, '加入群組成員失敗');

    return conversation;
}

export async function sendMessage(
    supabase: Client,
    conversationId: string,
    senderId: string,
    content: string
): Promise<ChatMessage> {
    if (!content.trim()) {
        throw new Error('訊息內容不可為空');
    }

    const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: senderId, content })
        .select()
        .single();

    if (error || !data) throw toError(error, '送出訊息失敗');

    return data;
}

export async function recallMessage(supabase: Client, messageId: string, senderId: string): Promise<void> {
    const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() } satisfies Partial<ChatMessage>)
        .eq('id', messageId)
        .eq('sender_id', senderId);

    if (error) throw toError(error, '收回訊息失敗');
}

export async function markConversationRead(
    supabase: Client,
    conversationId: string,
    userId: string
): Promise<void> {
    const { error } = await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() } satisfies Partial<ConversationMember>)
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

    if (error) throw toError(error, '標記已讀失敗');
}

export async function listChatUsers(supabase: Client): Promise<ChatUser[]> {
    const { data, error } = await supabase.rpc('list_chat_users');
    if (error) throw toError(error, '取得使用者清單失敗');
    return data ?? [];
}

/** 與 WelcomeHeader.tsx 一致：優先顯示 Google OAuth 姓名，缺少時退回 email 帳號名稱。 */
export function chatDisplayName(user: { email: string | null; full_name?: string | null }): string {
    return user.full_name ?? user.email?.split('@')[0] ?? '未知使用者';
}
