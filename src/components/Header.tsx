'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FC, useState, useEffect } from 'react';

export const Header = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');

    // Sync input with URL param 'q'
    useEffect(() => {
        setSearchTerm(searchParams.get('q') || '');
    }, [searchParams]);

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (searchTerm.trim()) {
                router.push(`/cases?q=${encodeURIComponent(searchTerm.trim())}`);
            } else {
                router.push('/cases');
            }
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all duration-300">
            <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex flex-col hover:opacity-80 transition-opacity">
                        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                            不動產代書追蹤系統
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500/80 dark:text-slate-400/80">Professional Scrivener Flow</p>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/40 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white dark:focus-within:bg-slate-800 group">
                        <span className="text-lg grayscale group-focus-within:grayscale-0 transition-all">🔍</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            placeholder="搜尋案號、買賣方、地址..."
                            className="bg-transparent border-none outline-none text-sm px-2 w-64 text-slate-600 dark:text-slate-300 placeholder:text-slate-400 font-medium"
                        />
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400">Enter</span>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block"></div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/cases/new"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                        >
                            <span>✨</span> 新增案件
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};
