import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useCrudDelete } from '@/hooks/useCrudDelete';
import { useAuthUser } from '@/hooks/useAuthUser';
export interface Clause {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    usage_count: number;
}

export function useClauses() {
    const supabase = createClient();
    const { data: clauses, loading, refetch: fetchClauses } = useSupabaseQuery<Clause>({
        table: 'contract_clauses',
        order: { column: 'usage_count', ascending: false },
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

    // Derived State
    const allTags = Array.from(new Set(clauses.flatMap((c) => c.tags || []))).sort();

    const categories = Array.from(new Set(clauses.map((c) => c.category).filter(Boolean))).sort();
    const tagsByCategory = Object.fromEntries(
        categories.map((cat) => {
            const catClauses = clauses.filter((c) => c.category === cat);
            const tagCount: Record<string, number> = {};
            catClauses.forEach((c) => (c.tags ?? []).forEach((t) => { tagCount[t] = (tagCount[t] ?? 0) + 1; }));
            return [cat, Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a])];
        })
    );

    const filteredClauses = clauses.filter((clause) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = clause.title.toLowerCase().includes(term) || clause.content.toLowerCase().includes(term);
        if (!matchesSearch) return false;

        if (searchTerm) return true; // 搜尋時跨所有分類

        if (!selectedCategory) return true;
        if (selectedCategory.includes('::')) {
            const [cat, tag] = selectedCategory.split('::');
            return clause.category === cat && (clause.tags?.includes(tag) ?? false);
        }
        return clause.category === selectedCategory;
    });

    const suggestions = clauses
        .filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm.length > 0)
        .slice(0, 5);

    return {
        clauses,
        filteredClauses,
        loading,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        copyFeedback,
        allTags,
        categories,
        tagsByCategory,
        suggestions,
        fetchClauses,
        handleDelete,
        handleCopy,
        handleSaveClause
    };
}
