'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, List, Search, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleCase {
    id: string;
    case_number: string;
    buyer_name?: string;
    seller_name?: string;
    city?: string;
    district?: string;
}

interface CaseNavigationProps {
    cases: SimpleCase[];
    currentCaseId: string;
}

export default function CaseNavigation({ cases, currentCaseId }: CaseNavigationProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Find current index
    const currentIndex = useMemo(() => {
        return cases.findIndex((c) => c.id === currentCaseId);
    }, [cases, currentCaseId]);

    const prevCase = currentIndex > 0 ? cases[currentIndex - 1] : null;
    const nextCase = currentIndex < cases.length - 1 ? cases[currentIndex + 1] : null;

    // Filtered cases for search
    const filteredCases = useMemo(() => {
        if (!searchQuery) return cases;
        const lowerQ = searchQuery.toLowerCase();
        return cases.filter(c =>
            c.case_number.toLowerCase().includes(lowerQ) ||
            c.buyer_name?.toLowerCase().includes(lowerQ) ||
            c.seller_name?.toLowerCase().includes(lowerQ) ||
            (c.city || '').toLowerCase().includes(lowerQ) ||
            (c.district || '').toLowerCase().includes(lowerQ)
        );
    }, [cases, searchQuery]);

    // Handle Click Outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle Keyboard Shortcuts (Alt + Left/Right)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key === 'ArrowLeft' && prevCase) {
                router.push(`/cases/${prevCase.id}`);
            }
            if (e.altKey && e.key === 'ArrowRight' && nextCase) {
                router.push(`/cases/${nextCase.id}`);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [prevCase, nextCase, router]);

    return (
        <div className="flex items-center gap-2 relative">
            {/* Back to List */}
            <Link
                href="/cases"
                className="bg-secondary/50 p-2 rounded-full text-black! dark:text-white! hover:bg-surface-hover hover:text-blue-600 transition-colors mr-2"
                title="返回列表"
            >
                <ArrowLeft size={18} />
            </Link>

            {/* Previous Case */}
            <Link
                href={prevCase ? `/cases/${prevCase.id}` : '#'}
                className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent",
                    prevCase
                        ? "text-black! font-bold dark:text-slate-300! hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                        : "text-slate-400! dark:text-slate-600! cursor-not-allowed pointer-events-none"
                )
}
                title={prevCase ? `上一筆: ${prevCase.case_number}` : "沒有上一筆資料"}
                aria-disabled={!prevCase}
            >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">上一筆</span>
            </Link>

            {/* Case Directory (Quick Switcher) */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-black! dark:text-slate-200! hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm w-48 sm:w-64 justify-between group"
                >
                    <div className="flex items-center gap-2 truncate">
                        <List size={16} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                        <span className="truncate font-black text-black!">
                            {currentIndex !== -1 ? cases[currentIndex].case_number : '選擇案件...'}
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {currentIndex + 1} / {cases.length}
                    </span>
                </button>

                {/* Custom Popover Content */}
                {open && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                        <div className="p-2 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="搜尋案號..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-md pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                            {filteredCases.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">找不到符合的案件</div>
                            ) : (
                                filteredCases.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            router.push(`/cases/${c.id}`);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-md transition-colors text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col gap-0.5",
                                            c.id === currentCaseId ? "bg-blue-50 dark:bg-blue-900/20" : ""
                                        )}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <span className={cn(
                                                "font-bold",
                                                c.id === currentCaseId ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"
                                            )}>
                                                {c.case_number}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {(c.city || c.district) ? `${c.city || ''}${c.district || ''}` : ''}
                                            </span>
                                        </div>
                                        {(c.buyer_name || c.seller_name) && (
                                            <label className="text-xs font-bold text-slate-500 uppercase">
                                                買: {c.buyer_name || '-'} / 賣: {c.seller_name || '-'}
                                            </label>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Next Case */}
            <Link
                href={nextCase ? `/cases/${nextCase.id}` : '#'}
                className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent",
                    nextCase
                        ? "text-black! font-bold dark:text-slate-300! hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                        : "text-slate-400! dark:text-slate-600! cursor-not-allowed pointer-events-none"
                )}
                title={nextCase ? `下一筆: ${nextCase.case_number}` : "沒有下一筆資料"}
                aria-disabled={!nextCase}
            >
                <span className="hidden sm:inline">下一筆</span>
                <ChevronRight size={18} />
            </Link>
        </div>
    );
}
