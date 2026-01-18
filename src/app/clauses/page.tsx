'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Search, Plus, BookOpen, Scale, FileText, Copy, Trash2, Edit, Tag } from 'lucide-react';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';
import GenericExportExcelButton from '@/components/features/cases/GenericExportExcelButton';

interface Clause {
    id: string;
    title: string; // 使用情境
    content: string; // 條文內容
    category: string; // Primary category for display
    tags: string[]; // Support multiple tags
    usage_count: number;
}

export default function ClausesPage() {
    const [clauses, setClauses] = useState<Clause[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    // selectedCategory used to default to 'All', now will be string | null. If null -> All.
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClause, setCurrentClause] = useState<Partial<Clause>>({ tags: [] });
    const [tagInput, setTagInput] = useState('');
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const [showSuggestions, setShowSuggestions] = useState(false);

    const clauseColumns = [
        { header: '類別', key: 'category', width: 15 },
        { header: '情境/標題', key: 'title', width: 30 },
        { header: '條文內容', key: 'content', width: 80 },
        { header: '使用次數', key: 'usage_count', width: 10 },
    ];

    useEffect(() => {
        fetchClauses();
    }, []);

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                alert('請先登入');
                return;
            }

            const payload = {
                ...currentClause,
                last_updated_by: user.id,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('contract_clauses')
                .upsert(payload as any)
                .select();

            if (error) throw error;

            setIsEditing(false);
            setCurrentClause({});
            fetchClauses();
        } catch (error: any) {
            alert('儲存失敗：' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這條常用條文嗎？')) return;
        try {
            const { error } = await supabase.from('contract_clauses').delete().eq('id', id);
            if (error) throw error;
            fetchClauses();
        } catch (error: any) {
            alert('刪除失敗：' + error.message);
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

    // --- Sidebar Logic ---
    const allTags = Array.from(new Set(clauses.flatMap((c) => c.tags || []))).sort();
    const uniqueCategories = Array.from(new Set(clauses.map((c) => c.category || '一般'))).sort();

    const sidebarGroups: SidebarGroup[] = [
        {
            title: "標籤索引",
            items: allTags.map(tag => ({
                id: tag,
                label: tag,
                count: clauses.filter(c => c.tags && c.tags.includes(tag)).length,
                icon: <Tag className="w-4 h-4 text-emerald-400" />
            }))
        }
    ];

    const filteredClauses = clauses.filter((clause) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = clause.title.toLowerCase().includes(term) || clause.content.toLowerCase().includes(term);
        const matchesCategory = selectedCategory ? (clause.category === selectedCategory || (clause.tags && clause.tags.includes(selectedCategory))) : true;
        return matchesSearch && matchesCategory;
    });

    const suggestions = clauses
        .filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm.length > 0)
        .slice(0, 5);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <PageSidebar
                title="常用條文庫"
                groups={sidebarGroups}
                selectedId={selectedCategory}
                onSelect={setSelectedCategory}
                className="hidden md:block shadow-sm z-10 sticky top-0 h-screen"
            />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <span className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
                                    ⚖️
                                </span>
                                代書常用條文
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">
                                快速檢索、複製與管理合約常用條款。
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    全團隊共用資料庫・即時同步
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <div className="relative group z-20">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="搜尋情境或條文內容..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    // Delay blur to allow click
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 shadow-sm transition-all"
                                />
                                {/* Suggestions Dropdown */}
                                {showSuggestions && searchTerm.length > 0 && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="text-[10px] font-bold text-slate-400 px-3 py-2 bg-slate-50 border-b border-slate-100 uppercase tracking-wider">
                                            快速選擇
                                        </div>
                                        {suggestions.map((s) => (
                                            <button
                                                key={s.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent blur
                                                    setSearchTerm(s.title);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group/item"
                                            >
                                                <span className="font-bold text-slate-700 group-hover/item:text-blue-600 text-sm">
                                                    {s.title}
                                                </span>
                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {s.category}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setCurrentClause({ category: selectedCategory || '一般', tags: [] });
                                    setIsEditing(true);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-xl shadow-slate-900/20 border border-slate-700/50 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">新增條文</span>
                            </button>

                            <GenericExportExcelButton
                                data={filteredClauses}
                                filename="代書系統_法律法規條文"
                                sheetName="合約條文"
                                columns={clauseColumns}
                            />
                        </div>
                    </div>

                    {/* Active Filter Mobile */}
                    {selectedCategory && (
                        <div className="md:hidden flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold">
                            <span>已選分類: {selectedCategory}</span>
                            <button onClick={() => setSelectedCategory(null)} className="ml-auto text-blue-400 hover:text-blue-700">清除</button>
                        </div>
                    )}

                    {/* Content List */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            {/* Simple Loader Placeholder */}
                            <div className="animate-pulse text-slate-400 font-bold">資料載入中...</div>
                        </div>
                    ) : filteredClauses.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">沒有找到條文</h3>
                            <p className="text-slate-500 mt-2">請調整搜尋條件或新增資料</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredClauses.map((clause) => (
                                <div key={clause.id} className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        {/* Left: Metadata */}
                                        <div className="sm:w-1/4 min-w-[200px] flex flex-col gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    {clause.category || '一般'}
                                                </span>
                                                {(clause.tags || []).map(t => (
                                                    <span key={t} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                        #{t}
                                                    </span>
                                                ))}
                                                {clause.usage_count > 0 && (
                                                    <span className="text-[10px] items-center gap-1 inline-flex text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                        🔥 {clause.usage_count}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                                {clause.title}
                                            </h3>
                                        </div>

                                        {/* Center: Content */}
                                        <div className="flex-1 relative group/content">
                                            <div
                                                onClick={() => handleCopy(clause.content, clause.id)}
                                                className="bg-slate-50 rounded-xl p-4 border border-slate-100 font-mono text-sm leading-relaxed text-slate-700 cursor-pointer hover:bg-blue-50/30 hover:border-blue-100 transition-colors relative"
                                            >
                                                <pre className="whitespace-pre-wrap font-sans">{clause.content}</pre>

                                                {/* Copy Overlay Hint */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/content:opacity-100 transition-opacity">
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold shadow-sm ${copyFeedback === clause.id
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-white text-slate-500 border border-slate-200'
                                                        }`}>
                                                        {copyFeedback === clause.id ? '已複製！' : '點擊複製'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="sm:w-12 flex sm:flex-col gap-2 justify-start items-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setCurrentClause(clause);
                                                    setIsEditing(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="編輯"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(clause.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="刪除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Edit/Add Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800">
                                {currentClause.id ? '編輯條文' : '新增常用條文'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">
                                        使用情境 (標題) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        value={currentClause.title || ''}
                                        onChange={(e) => setCurrentClause({ ...currentClause, title: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                        placeholder="例如：現況交屋"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">標籤 (按 Enter 新增)</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const trimmed = tagInput.trim();
                                                    if (trimmed && !(currentClause.tags || []).includes(trimmed)) {
                                                        setCurrentClause({
                                                            ...currentClause,
                                                            tags: [...(currentClause.tags || []), trimmed]
                                                        });
                                                        setTagInput('');
                                                    }
                                                }
                                            }}
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                            placeholder="例如：現況、違約"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {(currentClause.tags || []).map(t => (
                                            <span key={t} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                                #{t}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentClause({
                                                        ...currentClause,
                                                        tags: currentClause.tags?.filter(tag => tag !== t)
                                                    })}
                                                    className="hover:text-rose-500"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">
                                    條文內容 <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    required
                                    value={currentClause.content || ''}
                                    onChange={(e) => setCurrentClause({ ...currentClause, content: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[200px] text-sm leading-relaxed"
                                    placeholder="輸入完整的合約條文..."
                                />
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                {currentClause.id ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(currentClause.id!)}
                                        className="text-rose-500 hover:text-rose-600 text-sm font-medium px-2 py-1 hover:bg-rose-50 rounded"
                                    >
                                        刪除條文
                                    </button>
                                ) : (
                                    <div></div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all hover:shadow-lg active:scale-95"
                                    >
                                        儲存
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
