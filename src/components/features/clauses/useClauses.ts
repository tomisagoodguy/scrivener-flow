import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useCrudDelete } from '@/hooks/useCrudDelete';
import { useAuthUser } from '@/hooks/useAuthUser';
import {
    type ClauseTopic,
    type ClauseTopicGroupKey,
    filterClauses,
    groupClausesByTopic,
    normalizeClauseNote,
} from '@/lib/constants/clauseTopics';

export interface Clause {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    usage_count: number;
    topic: ClauseTopic | null;
    note: string | null;
}

export function useClauses() {
    const supabase = createClient();
    const { data: clauses, loading, refetch: fetchClauses } = useSupabaseQuery<Clause>({
        table: 'contract_clauses',
        order: { column: 'usage_count', ascending: false },
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopic, setSelectedTopic] = useState<ClauseTopicGroupKey | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const { requireUser } = useAuthUser();

    const { handleDelete } = useCrudDelete({
        table: 'contract_clauses',
        confirmMessage: '確定要刪除這條常用條文嗎？',
        onSuccess: fetchClauses,
    });

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyFeedback(id);
            setTimeout(() => setCopyFeedback(null), 2000);

            // Increment usage count in DB only; skip refetch so the list doesn't reorder under the user's click
            await supabase.rpc('increment_clause_usage', { row_id: id });
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const handleSaveClause = async (clause: Partial<Clause>, _isNew: boolean) => {
        try {
            const user = await requireUser();

            const payload = {
                ...clause,
                note: normalizeClauseNote(clause.note),
                last_updated_by: user.id,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('contract_clauses')
                .upsert(payload as Record<string, unknown>)
                .select();

            if (error) throw error;
            fetchClauses();
            return true;
        } catch (error: unknown) {
            alert('儲存失敗：' + (error as Error).message);
            return false;
        }
    };

    // Derived State：側欄用全部條文的主題分組（含條數），列表用篩選後的分組
    const allTopicGroups = groupClausesByTopic(clauses);
    const filteredClauses = filterClauses(clauses, searchTerm, selectedTopic);
    const groupedClauses = groupClausesByTopic(filteredClauses);

    const suggestions = clauses
        .filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm.length > 0)
        .slice(0, 5);

    return {
        clauses,
        filteredClauses,
        groupedClauses,
        allTopicGroups,
        loading,
        searchTerm,
        setSearchTerm,
        selectedTopic,
        setSelectedTopic,
        copyFeedback,
        suggestions,
        fetchClauses,
        handleDelete,
        handleCopy,
        handleSaveClause
    };
}
