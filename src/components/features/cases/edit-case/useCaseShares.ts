import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addShare, removeShare, reactivateShare, listShares, searchShareableUsers } from '@/services/caseShareService';
import type { CaseShare } from '@/types/caseShare';
import type { ChatUser } from '@/types/chat';

interface ShareWithUserInfo extends CaseShare {
    email: string | null;
    fullName: string | null;
}

interface UseCaseSharesResult {
    activeShares: ShareWithUserInfo[];
    rejectedShares: ShareWithUserInfo[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    searchResults: ChatUser[];
    addUser: (userId: string) => Promise<void>;
    removeUser: (userId: string) => Promise<void>;
    reactivateUser: (userId: string) => Promise<void>;
}

/** 案件分享面板的資料與操作邏輯，串接 caseShareService。 */
export function useCaseShares(caseId: string, currentUserId: string): UseCaseSharesResult {
    const supabase = useMemo(() => createClient(), []);
    const [shares, setShares] = useState<CaseShare[]>([]);
    // 可分享使用者的完整名單（未篩選），同時用來解析既有分享名單的 email/姓名顯示。
    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [shareRows, users] = await Promise.all([
                listShares(supabase, caseId),
                searchShareableUsers(supabase, ''),
            ]);
            setShares(shareRows);
            setAllUsers(users);
        } catch (err) {
            setError(err instanceof Error ? err.message : '取得分享名單失敗');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caseId]);

    useEffect(() => {
        reload();
    }, [reload]);

    const sharesWithUserInfo: ShareWithUserInfo[] = shares.map((s) => {
        const matched = allUsers.find((u) => u.id === s.shared_with);
        return { ...s, email: matched?.email ?? null, fullName: matched?.full_name ?? null };
    });
    const activeShares = sharesWithUserInfo.filter((s) => s.status === 'active');
    const rejectedShares = sharesWithUserInfo.filter((s) => s.status === 'rejected');

    const searchResults = useMemo(() => {
        const trimmed = searchQuery.trim().toLowerCase();
        const notYetShared = allUsers.filter((u) => !shares.some((s) => s.shared_with === u.id));
        if (!trimmed) return notYetShared;
        return notYetShared.filter((u) => {
            const email = u.email?.toLowerCase() ?? '';
            const name = u.full_name?.toLowerCase() ?? '';
            return email.includes(trimmed) || name.includes(trimmed);
        });
    }, [allUsers, shares, searchQuery]);

    const addUser = async (userId: string) => {
        setError(null);
        try {
            await addShare(supabase, caseId, userId, currentUserId);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : '分享失敗');
        }
    };

    const removeUser = async (userId: string) => {
        setError(null);
        try {
            await removeShare(supabase, caseId, userId);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : '移除分享失敗');
        }
    };

    const reactivateUser = async (userId: string) => {
        setError(null);
        try {
            await reactivateShare(supabase, caseId, userId);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : '重新分享失敗');
        }
    };

    return {
        activeShares,
        rejectedShares,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        searchResults,
        addUser,
        removeUser,
        reactivateUser,
    };
}
