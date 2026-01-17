'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FC, useState, useEffect } from 'react';

export const Header = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setSearchTerm(searchParams.get('q') || '');
    }, [searchParams]);

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                params.set('q', searchTerm);
            } else {
                params.delete('q');
            }
            router.push(`/cases?${params.toString()}`);
        }
    };

    const navItems = [
        { name: '儀表板', href: '/', icon: '📊' },
        { name: '案件管理', href: '/cases', icon: '📁' },
        { name: '銀行資訊', href: '/banks', icon: '🏦' },
        { name: '代償資料', href: '/redemptions', icon: '💰' },
        { name: '法規條文', href: '/clauses', icon: '⚖️' },
        { name: '辦案指南', href: '/guidelines', icon: '🧭' },
        { name: '工作筆記', href: '/notes', icon: '📝' },
        { name: '共筆', href: '/knowledge', icon: '📚' },
    ];

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all duration-300">
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Mobile Menu Trigger */}
                        <button
                            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => setIsMenuOpen(true)}
                        >
                            <span className="text-xl">☰</span>
                        </button>

                        <Link href="/" className="flex flex-col hover:opacity-80 transition-opacity">
                            <h1 className="text-lg md:text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                                不動產代書
                            </h1>
                            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-black text-slate-500/80 dark:text-slate-400/80">
                                Scrivener Flow
                            </p>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden xl:flex items-center gap-1 mx-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                            >
                                <span>{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Search Bar - Desktop */}
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

                        <div className="flex items-center gap-2 md:gap-3">
                            <Link
                                href="/cases/new"
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                            >
                                <span>✨</span>
                                <span className="hidden md:inline">新增案件</span>
                                <span className="md:hidden">新增</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-3/4 max-w-xs bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col gap-6 animate-slide-in-from-left">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">選單</h2>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Mobile Search */}
                        <div className="space-y-4">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                                <span className="mr-2">🔍</span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch(e);
                                            setIsMenuOpen(false);
                                        }
                                    }}
                                    placeholder="搜尋..."
                                    className="bg-transparent w-full text-sm outline-none"
                                />
                            </div>
                        </div>

                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 font-bold"
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    {item.name}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-6">
                            <p className="text-xs text-center text-slate-400 m-0">Scrivener Flow Mobile v2.0</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
