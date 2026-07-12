'use client';

import { OnlineDot } from './OnlineDot';
import type { ConversationListItem } from './hooks/useConversationList';

interface Props {
    conversations: ConversationListItem[];
    unreadByConversation: Record<string, number>;
    selectedId: string | null;
    currentUserId: string;
    userNameById: Record<string, string>;
    onlineUserIds: Set<string>;
    onSelect: (id: string) => void;
}

function otherMemberId(conv: ConversationListItem, currentUserId: string): string | undefined {
    return conv.memberIds.find((id) => id !== currentUserId);
}

function displayName(conv: ConversationListItem, currentUserId: string, userNameById: Record<string, string>): string {
    if (conv.is_group) return conv.name ?? '群組對話';
    const otherId = otherMemberId(conv, currentUserId);
    return (otherId && userNameById[otherId]) ?? '1 對 1 對話';
}

export function ConversationList({
    conversations,
    unreadByConversation,
    selectedId,
    currentUserId,
    userNameById,
    onlineUserIds,
    onSelect,
}: Props) {
    if (conversations.length === 0) {
        return <p className="text-sm text-slate-400 p-4">尚無對話，點擊右上角開始聊天</p>;
    }

    return (
        <ul className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            {conversations.map((conv) => {
                const unread = unreadByConversation[conv.id] ?? 0;
                const otherId = otherMemberId(conv, currentUserId);
                return (
                    <li key={conv.id}>
                        <button
                            onClick={() => onSelect(conv.id)}
                            className={`w-full text-left p-3 rounded-2xl glass-card transition-shadow ${selectedId === conv.id ? 'ring-2 ring-blue-500/40' : ''}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 min-w-0">
                                    {!conv.is_group && otherId && <OnlineDot online={onlineUserIds.has(otherId)} />}
                                    <span className="font-bold text-sm truncate">{displayName(conv, currentUserId, userNameById)}</span>
                                </span>
                                {unread > 0 && (
                                    <span className="shrink-0 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                                        {unread}
                                    </span>
                                )}
                            </div>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
