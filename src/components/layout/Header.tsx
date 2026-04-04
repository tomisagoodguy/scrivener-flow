'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useWeather } from '@/hooks/useWeather';

import { WeatherAnimation } from './WeatherAnimation';
import { ThemeToggler } from '@/components/ui/ThemeToggler';

export default function Header() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
    const weather = useWeather();

    // Live Clock Logic
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);


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
        { name: '投資監控', href: '/investment', icon: '📈' },
        { name: '共筆', href: '/knowledge', icon: '📚' },
        { name: '稅費試算', href: '/calculator', icon: '🧮' },
    ];

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all duration-300 overflow-hidden">
                {/* Ambient Weather Background */}
                <div className={`absolute inset-0 opacity-20 bg-linear-to-r ${weather ? weather.bg : 'from-white to-slate-50'} transition-all duration-1000`} />
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/70" />

                {/* Weather Animation Layer */}
                <WeatherAnimation />

                <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Mobile Menu Trigger */}
                        <button
                            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => setIsMenuOpen(true)}
                        >
                            <span className="text-xl">☰</span>
                        </button>
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

                    {/* Live Clock & Weather Widget */}
                    {now && (
                        <div className="hidden 2xl:flex items-center gap-3 px-4 py-1.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mx-auto select-none hover:bg-white/80 dark:hover:bg-slate-800 transition-colors shadow-sm backdrop-blur-sm">

                            {/* Weather Icon (if loaded) */}
                            {weather && (
                                <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-700">
                                    <span className="text-xl animate-pulse-slow">{weather.icon}</span>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-tight">
                                            士林區
                                        </span>
                                        <span className="text-[12px] font-bold text-slate-400 leading-tight">
                                            {weather.temp}°C {weather.label}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 tracking-widest tabular-nums pl-1">
                                {format(now, 'HH:mm')}
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                                    {format(now, 'MM/dd EEEE', { locale: zhTW })}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Search Bar - Desktop */}
                        <div className="hidden xl:flex items-center bg-slate-100 dark:bg-slate-800/40 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white dark:focus-within:bg-slate-800 group">
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
                                <span className="text-[12px] font-black text-slate-400">Enter</span>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block"></div>

                        <div className="flex items-center gap-2 md:gap-3">
                            {/* Theme Toggler */}
                            <ThemeToggler />
                            
                            <Link
                                href="/cases/new"
                                className="bg-linear-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
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
                <div className="fixed inset-0 z-100 lg:hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-3/4 max-w-xs bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col gap-6 animate-slide-in-from-left overflow-y-auto">
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
}
