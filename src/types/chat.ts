export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_by: string;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

export interface ChatUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

export interface ConversationSummary extends Conversation {
  members: ConversationMember[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface ChatBroadcastPayload {
  type: 'new_message';
  message: ChatMessage;
}
