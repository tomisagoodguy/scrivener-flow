'use client';

import { Trash2 } from 'lucide-react';
import { OnlineDot } from './OnlineDot';
import { useBlinkingBadge } from './hooks/useBlinkingBadge';
import type { ConversationListItem } from './hooks/useConversationList';

interface Props {
    conversations: ConversationListItem[];
    unreadByConversation: Record<string, number>;
    selectedId: string | null;
    currentUserId: string;
    userNameById: Record<string, string>;
    onlineUserIds: Set<string>;
    onSelect: (id: string) => void;
    onHide: (id: string) => void;
}

function otherMemberId(conv: ConversationListItem, currentUserId: string): string | undefined {
    return conv.memberIds.find((id) => id !== currentUserId);
}

function displayName(conv: ConversationListItem, currentUserId: string, userNameById: Record<string, string>): string {
    if (conv.is_group) return conv.name ?? '群組對話';
    const otherId = otherMemberId(conv, currentUserId);
    return (otherId && userNameById[otherId]) ?? '1 對 1 對話';
}

interface RowProps {
    conv: ConversationListItem;
    unread: number;
    isSelected: boolean;
    currentUserId: string;
    userNameById: Record<string, string>;
    onlineUserIds: Set<string>;
    onSelect: (id: string) => void;
    onHide: (id: string) => void;
}

// 拆成獨立元件（而非在 .map 內直接呼叫 hook）：每個對話的 displayCount/isBlinking
// 需要跨 render 保留各自的 state，必須讓每個對話有自己穩定的元件實例（key=conv.id）。
function ConversationRow({ conv, unread, isSelected, currentUserId, userNameById, onlineUserIds, onSelect, onHide }: RowProps) {
    const { displayCount, isBlinking } = useBlinkingBadge(unread);
    const otherId = otherMemberId(conv, currentUserId);

    return (
        <li className={`group flex items-center gap-1 rounded-2xl glass-card ${isSelected ? 'ring-2 ring-blue-500/40' : ''}`}>
            <button onClick={() => onSelect(conv.id)} className="flex-1 min-w-0 text-left p-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                        {!conv.is_group && otherId && <OnlineDot online={onlineUserIds.has(otherId)} />}
                        <span className="font-bold text-sm truncate">{displayName(conv, currentUserId, userNameById)}</span>
                    </span>
                    {displayCount > 0 && (
                        <span
                            className={`shrink-0 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ${isBlinking ? 'animate-blink-badge' : ''}`}
                        >
                            {displayCount}
                        </span>
                    )}
                </div>
            </button>
            <button
                onClick={() => onHide(conv.id)}
                aria-label="刪除對話"
                title="刪除對話（僅從你的清單移除）"
                className="shrink-0 p-2 mr-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
            >
                <Trash2 size={14} />
            </button>
        </li>
    );
}

export function ConversationList({
    conversations,
    unreadByConversation,
    selectedId,
    currentUserId,
    userNameById,
    onlineUserIds,
    onSelect,
    onHide,
}: Props) {
    if (conversations.length === 0) {
        return <p className="text-sm text-slate-400 p-4">尚無對話，點擊右上角開始聊天</p>;
    }

    return (
        <ul className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            {conversations.map((conv) => (
                <ConversationRow
                    key={conv.id}
                    conv={conv}
                    unread={unreadByConversation[conv.id] ?? 0}
                    isSelected={selectedId === conv.id}
                    currentUserId={currentUserId}
                    userNameById={userNameById}
                    onlineUserIds={onlineUserIds}
                    onSelect={onSelect}
                    onHide={onHide}
                />
            ))}
        </ul>
    );
}
