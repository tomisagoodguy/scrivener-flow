'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, Plus, X, Folder, Tag, BookOpen, Star } from 'lucide-react';
import NoteCard, { TeamNote } from './NoteCard';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';
import { useRouter } from 'next/navigation';

export default function TeamKnowledgeBase() {
    const router = useRouter();
    const [notes, setNotes] = useState<TeamNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Unified selection state for sidebar
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [stats, setStats] = useState<{ categories: Record<string, number>, tags: Record<string, number>, pinned: number }>({ categories: {}, tags: {}, pinned: 0 });

    // Helper to parse selection
    const getFilterFromId = (id: string | null) => {
        if (!id) return { type: null, value: null };
        if (id === 'pinned') return { type: 'pinned', value: true };
        const [type, ...rest] = id.split(':');
        return { type, value: rest.join(':') };
    };

    // Fetch notes
    const fetchNotes = async () => {
        setLoading(true);

        try {
            let query = supabase
                .from('team_notes')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            const { type, value } = getFilterFromId(selectedId);

            if (type === 'pinned') {
                query = query.eq('is_pinned', true);
            } else if (type === 'cat' && value) {
                query = query.eq('category', value);
            } else if (type === 'tag' && value) {
                query = query.contains('tags', [value]);
            }

            if (searchQuery) {
                query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching notes:', error);
            } else {
                // Transform data
                const transformedNotes = (data || []).map((note: any) => ({
                    ...note,
                    author_name: '匿名',
                }));

                setNotes(transformedNotes);
            }
        } catch (err) {
            console.error('Unexpected error in fetchNotes:', err);
        }

        setLoading(false);
    };

    // Fetch stats
    const fetchStats = async () => {
        const { data } = await supabase.from('team_notes').select('category, tags, is_pinned');

        if (data) {
            const categories: Record<string, number> = {};
            const tags: Record<string, number> = {};
            let pinnedCount = 0;

            data.forEach((note: any) => {
                // Count categories
                if (note.category) {
                    categories[note.category] = (categories[note.category] || 0) + 1;
                }

                // Count tags
                if (note.tags) {
                    note.tags.forEach((tag: string) => {
                        tags[tag] = (tags[tag] || 0) + 1;
                    });
                }

                // Count pinned
                if (note.is_pinned) {
                    pinnedCount++;
                }
            });

            setStats({ categories, tags, pinned: pinnedCount });
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [selectedId, searchQuery]);

    useEffect(() => {
        fetchStats();
    }, []); // Only fetch stats once or when data changes ideally, but strict dependency allows independence

    // Construct Sidebar Groups
    const sidebarGroups: SidebarGroup[] = [
        {
            title: "快速存取",
            items: [
                {
                    id: 'pinned',
                    label: '置頂筆記',
                    count: stats.pinned,
                    icon: <Star className="w-4 h-4 text-amber-400" />
                }
            ]
        },
        {
            title: "分類",
            items: Object.entries(stats.categories).map(([cat, count]) => ({
                id: `cat:${cat}`,
                label: cat,
                count: count,
                icon: <Folder className="w-4 h-4 text-indigo-400" />
            }))
        },
        {
            title: "標籤",
            items: Object.entries(stats.tags).map(([tag, count]) => ({
                id: `tag:${tag}`,
                label: tag,
                count: count,
                icon: <Tag className="w-4 h-4 text-emerald-400" />
            }))
        }
    ];

    const { type: filterType, value: filterValue } = getFilterFromId(selectedId);

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            <PageSidebar
                title="共筆知識庫"
                groups={sidebarGroups}
                selectedId={selectedId}
                onSelect={setSelectedId}
                className="hidden md:block shadow-sm z-10"
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <span className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                                    📚
                                </span>
                                共筆知識庫
                            </h1>
                            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                全團隊共用資料庫・即時同步
                            </span>
                        </div>

                        <button
                            onClick={() => router.push('/knowledge/new')}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">新增筆記</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜尋筆記標題或內容..."
                                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Filters Mobile Display / Visual confirmation */}
                    {selectedId && (
                        <div className="mt-4 flex items-center gap-2 md:hidden">
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-indigo-100">
                                {filterType === 'pinned' ? '置頂' :
                                    filterType === 'cat' ? `分類: ${filterValue}` :
                                        `標籤: ${filterValue}`}
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="hover:text-indigo-900 ml-1"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        </div>
                    )}
                </div>

                {/* Notes Grid */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-pulse text-slate-400 font-bold">資料載入中...</div>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                <span className="text-4xl">📝</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">
                                沒有找到相關筆記
                            </h3>
                            <p className="text-slate-400 mb-6 max-w-xs mx-auto">
                                嘗試調整搜尋條件，或是新增一篇新的筆記內容。
                            </p>
                            <button
                                onClick={() => router.push('/knowledge/new')}
                                className="text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
                            >
                                建立新筆記
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-6">
                            {notes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    onClick={() => router.push(`/knowledge/${note.id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
