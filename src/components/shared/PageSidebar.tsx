import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, LayoutGrid, List } from 'lucide-react';

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
}

export function PageSidebar({ title, groups, selectedId, onSelect, className }: PageSidebarProps) {
    return (
        <div className={cn("w-64 flex-shrink-0 bg-white border-r border-slate-200 h-[calc(100vh-64px)] overflow-y-auto sticky top-16", className)}>
            <div className="p-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <List className="w-4 h-4 text-slate-500" />
                    {title}
                </h2>
            </div>

            <div className="p-3 space-y-6">
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

                {groups.map((group, idx) => (
                    <div key={idx} className="space-y-1">
                        <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            {group.title}
                        </h3>
                        {group.items.map((item) => (
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
                                <span className="flex items-center gap-2 truncate">
                                    {item.icon}
                                    <span className="truncate">{item.label}</span>
                                </span>
                                {(item.count !== undefined) && (
                                    <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded-full transition-colors",
                                        selectedId === item.id
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                    )}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
