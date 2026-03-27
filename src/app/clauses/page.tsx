'use client';

import { useState } from 'react';
import { Search, Plus, Tag } from 'lucide-react';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';
import GenericExportExcelButton from '@/components/features/cases/GenericExportExcelButton';
import { useClauses, Clause } from '@/components/features/clauses/useClauses';
import { ClauseEditModal } from '@/components/features/clauses/ClauseEditModal';
import { ClauseItem } from '@/components/features/clauses/ClauseItem';

export default function ClausesPage() {
    const {
        clauses,
        filteredClauses,
        loading,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        copyFeedback,
        allTags,
        suggestions,
        handleDelete,
        handleCopy,
        handleSaveClause
    } = useClauses();

    const [isEditing, setIsEditing] = useState(false);
    const [currentClause, setCurrentClause] = useState<Partial<Clause>>({ tags: [] });
    const [showSuggestions, setShowSuggestions] = useState(false);

    const clauseColumns = [
        { header: '情境/標題', key: 'title', width: 30 },
        { header: '條文內容', key: 'content', width: 80 },
    ];

    const sidebarGroups: SidebarGroup[] = [{
        title: '',
        items: allTags.map((tag: string) => ({
            id: tag,
            label: tag,
            count: clauses.filter((c) => c.tags?.includes(tag)).length,
            icon: <Tag className="w-4 h-4 text-emerald-400" />,
        })),
    }];

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <PageSidebar
                title="常用條文庫"
                groups={sidebarGroups}
                selectedId={selectedCategory}
                onSelect={setSelectedCategory}
                searchable
                hotThreshold={2}
                className="hidden md:block shadow-sm z-10 sticky top-0 h-screen"
            />

            <main className="flex-1 p-6 md:p-12">
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
                                    setCurrentClause({ tags: [] });
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
                                <ClauseItem
                                    key={clause.id}
                                    clause={clause}
                                    copyFeedback={copyFeedback}
                                    onCopy={handleCopy}
                                    onEdit={(c) => {
                                        setCurrentClause(c);
                                        setIsEditing(true);
                                    }}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Edit/Add Modal */}
            {isEditing && (
                <ClauseEditModal
                    initialClause={currentClause}
                    onClose={() => setIsEditing(false)}
                    onSave={handleSaveClause}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}
