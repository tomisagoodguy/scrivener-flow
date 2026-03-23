import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid, List, Search } from 'lucide-react';

export interface SidebarGroup {
    title: string;
    items: SidebarItem[];
}

export interface SidebarItem {
    id: string;
    label: string;
    count?: number;
    icon?: React.ReactNode;
}

interface PageSidebarProps {
    title: string;
    groups: SidebarGroup[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    className?: string;
    /** 是否顯示標籤搜尋框（適合標籤數量多的頁面）*/
    searchable?: boolean;
    /** 熱門標籤的 count 門檻，預設 2 */
    hotThreshold?: number;
}

export function PageSidebar({
    title,
    groups,
    selectedId,
    onSelect,
    className,
    searchable = false,
    hotThreshold = 2,
}: PageSidebarProps) {
    const [filterText, setFilterText] = useState('');

    return (
        <div className={cn("w-64 shrink-0 bg-white border-r border-slate-200 h-[calc(100vh-64px)] overflow-y-auto sticky top-16", className)}>
            <div className="p-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <List className="w-4 h-4 text-slate-500" />
                    {title}
                </h2>
            </div>

            <div className="p-3 space-y-4">
                {/* 全部顯示 */}
                <div className="space-y-1">
                    <button
                        onClick={() => onSelect(null)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            selectedId === null
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4" />
                            全部顯示
                        </span>
                    </button>
                </div>

                {/* 即時搜尋框 */}
                {searchable && (
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="搜尋標籤..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                        />
                        {filterText && (
                            <button
                                onClick={() => setFilterText('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                {/* 群組列表 */}
                {groups.map((group, idx) => {
                    const term = filterText.toLowerCase();

                    // 過濾 + 分層：熱門 / 一般
                    const matched = group.items.filter(item =>
                        !term || item.label.toLowerCase().includes(term)
                    );

                    const hotItems = matched.filter(item => (item.count ?? 0) >= hotThreshold);
                    const restItems = matched.filter(item => (item.count ?? 0) < hotThreshold);

                    if (matched.length === 0) return null;

                    const renderItem = (item: SidebarItem) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                                selectedId === item.id
                                    ? "bg-white border border-indigo-200 text-indigo-700 shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                            )}
                        >
                            <span className="flex items-center gap-2 truncate min-w-0">
                                {item.icon}
                                <span className="truncate">{item.label}</span>
                            </span>
                            {item.count !== undefined && (
                                <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded-full transition-colors shrink-0 ml-1",
                                    selectedId === item.id
                                        ? "bg-indigo-100 text-indigo-700"
                                        : (item.count ?? 0) >= hotThreshold
                                            ? "bg-amber-100 text-amber-700 group-hover:bg-amber-200"
                                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                )}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    );

                    return (
                        <div key={idx} className="space-y-1">
                            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                {group.title}
                                {filterText && (
                                    <span className="ml-1 text-indigo-400 normal-case font-normal">
                                        ({matched.length} 筆)
                                    </span>
                                )}
                            </h3>

                            {/* 熱門區 */}
                            {!filterText && hotItems.length > 0 && (
                                <>
                                    <div className="px-3 py-1 flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">🔥 熱門</span>
                                    </div>
                                    {hotItems.map(renderItem)}
                                    {restItems.length > 0 && (
                                        <div className="mx-3 my-2 border-t border-slate-100" />
                                    )}
                                </>
                            )}

                            {/* 正常搜尋時不分層 */}
                            {filterText
                                ? matched.map(renderItem)
                                : restItems.map(renderItem)
                            }
                        </div>
                    );
                })}

                {/* 搜尋無結果 */}
                {searchable && filterText && groups.every(g =>
                    !g.items.some(item => item.label.toLowerCase().includes(filterText.toLowerCase()))
                ) && (
                    <p className="px-3 py-4 text-xs text-slate-400 text-center">
                        找不到「{filterText}」相關標籤
                    </p>
                )}
            </div>
        </div>
    );
}
