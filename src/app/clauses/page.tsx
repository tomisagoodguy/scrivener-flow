'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

import GenericExportExcelButton from '@/components/GenericExportExcelButton';

interface Clause {
    id: string;
    title: string; // 使用情境
    content: string; // 條文內容
    category: string;
    usage_count: number;
}

export default function ClausesPage() {
    const [clauses, setClauses] = useState<Clause[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [isEditing, setIsEditing] = useState(false);
    const [currentClause, setCurrentClause] = useState<Partial<Clause>>({});
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
            const { data: { user } } = await supabase.auth.getUser();
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

    const filteredClauses = clauses.filter(clause => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            clause.title.toLowerCase().includes(term) ||
            clause.content.toLowerCase().includes(term);
        const matchesCategory = selectedCategory === 'All' || clause.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const suggestions = clauses
        .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm.length > 0)
        .slice(0, 5);

    const categories = ['All', ...Array.from(new Set(clauses.map(c => c.category || '一般')))];

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto font-sans bg-background">


            <main className="mt-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                            ← 返回首頁
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                                📜 代書常用條文庫
                            </h1>
                            <span className="text-xs text-blue-500/80 font-medium px-1">
                                全團隊共用資料庫・即時同步
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto flex-wrap items-center">
                        <div className="relative flex-1 md:w-80 group z-20">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="🔍 搜尋情境關鍵字 (如: 違約、漏水)..."
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    // Delay blur to allow click on suggestion
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {/* Autocomplete Dropdown */}
                            {showSuggestions && searchTerm.length > 0 && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform origin-top animate-in fade-in slide-in-from-top-2">
                                    <div className="text-xs font-bold text-gray-400 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                        快速選擇
                                    </div>
                                    {suggestions.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setSearchTerm(s.title);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between group/item"
                                        >
                                            <span className="font-bold text-gray-700 dark:text-gray-200 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400">
                                                {s.title}
                                            </span>
                                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                {s.category}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <GenericExportExcelButton
                            data={filteredClauses}
                            columns={clauseColumns}
                            filename="代書系統_法律法規條文"
                            sheetName="合約條文"
                            buttonText="打包 Excel"
                        />
                        <button
                            onClick={() => { setCurrentClause({ category: '一般' }); setIsEditing(true); }}
                            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap h-[46px]"
                        >
                            + 新增
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                                }`}
                        >
                            {cat || '未分類'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-900 font-bold text-lg">資料載入中...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-gray-100 border-b-2 border-gray-300">
                                    <tr>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 whitespace-nowrap min-w-[200px] border-r border-gray-300">情境 / 分類</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 min-w-[400px] border-r border-gray-300">條文內容 (點擊複製)</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 w-24 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {filteredClauses.map(clause => (
                                        <tr key={clause.id} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="px-4 py-4 align-top border-r border-gray-300">
                                                <div className="font-bold text-lg text-gray-900 mb-2">{clause.title}</div>
                                                <div className="flex flex-wrap gap-2 items-center">
                                                    <span className="bg-blue-100 text-blue-800 border border-blue-200 text-xs px-2 py-1 rounded font-medium">
                                                        {clause.category || '一般'}
                                                    </span>
                                                    {clause.usage_count > 0 && (
                                                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                            已用 {clause.usage_count} 次
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 align-top border-r border-gray-300">
                                                <div
                                                    className="relative group/copy cursor-pointer p-2 -m-2 rounded hover:bg-gray-50"
                                                    onClick={() => handleCopy(clause.content, clause.id)}
                                                    title="點擊複製條文"
                                                >
                                                    <pre className="whitespace-pre-wrap font-medium text-gray-900 font-sans leading-relaxed text-base">
                                                        {clause.content}
                                                    </pre>
                                                    <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded transition-opacity pointer-events-none ${copyFeedback === clause.id
                                                        ? 'bg-green-600 text-white opacity-100'
                                                        : 'bg-black/75 text-white opacity-0 group-hover/copy:opacity-100'
                                                        }`}>
                                                        {copyFeedback === clause.id ? '已複製！' : '複製'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 align-top text-center">
                                                <div className="flex flex-col gap-2 items-center justify-start opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setCurrentClause(clause); setIsEditing(true); }}
                                                        className="p-1.5 text-blue-800 hover:bg-blue-100 rounded bg-white border border-blue-300"
                                                        title="編輯"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(clause.id)}
                                                        className="p-1.5 text-red-800 hover:bg-red-100 rounded bg-white border border-red-300"
                                                        title="刪除"
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredClauses.length === 0 && (
                            <div className="p-12 text-center text-gray-500 bg-gray-50">
                                查無相符條文，請嘗試其他關鍵字或分類
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Edit/Add Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {currentClause.id ? '編輯條文' : '新增常用條文'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">×</button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">使用情境 (標題) *</label>
                                    <input
                                        required
                                        value={currentClause.title || ''}
                                        onChange={e => setCurrentClause({ ...currentClause, title: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="例如：現況交屋"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">分類</label>
                                    <input
                                        value={currentClause.category || ''}
                                        onChange={e => setCurrentClause({ ...currentClause, category: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="例如：交屋、違約、稅費"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">條文內容 *</label>
                                <textarea
                                    required
                                    value={currentClause.content || ''}
                                    onChange={e => setCurrentClause({ ...currentClause, content: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[200px] font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="輸入完整的合約條文..."
                                />
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                                {currentClause.id ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(currentClause.id!)}
                                        className="text-red-500 hover:text-red-600 font-medium px-4"
                                    >
                                        刪除條文
                                    </button>
                                ) : <div></div>}

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
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
