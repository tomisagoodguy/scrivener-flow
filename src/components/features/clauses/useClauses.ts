import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Clause {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    usage_count: number;
}

export function useClauses() {
    const [clauses, setClauses] = useState<Clause[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Copy feedback state
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const fetchClauses = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contract_clauses')
                .select('*')
                .order('usage_count', { ascending: false });

            if (error) throw error;
            setClauses(data || []);
        } catch (error) {
            console.error('Error fetching clauses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClauses();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這條常用條文嗎？')) return;
        try {
            const { error } = await supabase.from('contract_clauses').delete().eq('id', id);
            if (error) throw error;
            fetchClauses();
        } catch (error: unknown) {
            alert('刪除失敗：' + (error as Error).message);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyFeedback(id);
            setTimeout(() => setCopyFeedback(null), 2000);

            // Increment usage count silently
            await supabase.rpc('increment_clause_usage', { row_id: id });
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const handleSaveClause = async (clause: Partial<Clause>, _isNew: boolean) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('請先登入');
            }

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
        categories.map((cat) => [
            cat,
            Array.from(new Set(clauses.filter((c) => c.category === cat).flatMap((c) => c.tags || []))).sort(),
        ])
    );

    const filteredClauses = clauses.filter((clause) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = clause.title.toLowerCase().includes(term) || clause.content.toLowerCase().includes(term);
        if (!matchesSearch) return false;

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
