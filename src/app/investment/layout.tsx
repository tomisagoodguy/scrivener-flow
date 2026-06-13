'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon, ChevronDownIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ThemeToggle from '@/components/layout/ThemeToggle';

const primaryNavItems = [
    { name: '選股池', href: '/investment' },
    { name: '籌碼排行', href: '/investment/equity' },
    { name: '策略選股', href: '/investment/strategy' },
    { name: '族群強弱', href: '/investment/sectors' },
];

const moreGroup = [
    { name: '同步加碼', href: '/investment/momentum' },
    { name: '法人共識', href: '/investment/consensus' },
    { name: 'ETF 對比', href: '/investment/compare' },
    { name: '歷史回顧', href: '/investment/history' },
    { name: '營收實驗室', href: '/investment/revenue-lab' },
    { name: '模式分析', href: '/investment/buying-patterns' },
    { name: '買貴了嗎', href: '/investment/frontrunning' },
    { name: '共識掃描 / 投信追蹤', href: '/investment/consensus-signal?tab=watchlist' },
];

const watchGroup = [
    { name: '觀察清單', href: '/investment/watch-list' },
    { name: '裸K看盤', href: '/investment/bare-k' },
];

function useHoverDropdown() {
    const [open, setOpen] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    const onEnter = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
    const onLeave = () => { timer.current = setTimeout(() => setOpen(false), 150); };
    return { open, onEnter, onLeave };
}

export default function InvestmentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const watch = useHoverDropdown();
    const more = useHoverDropdown();

    const isWatchActive = watchGroup.some((i) => pathname.startsWith(i.href));
    const isMoreActive = moreGroup.some((i) => pathname.startsWith(i.href.split('?')[0]));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
            {/* Decorative blobs — same as root layout */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow" />
            <div
                className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 dark:bg-violet-500/3 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-slow"
                style={{ animationDelay: '2s' }}
            />

            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    {/* Brand + Nav */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <span className="text-white font-black text-sm">S</span>
                            </div>
                            <span className="font-black text-sm text-slate-700 dark:text-slate-200 tracking-tight">
                                投資監控
                            </span>
                        </div>

                        <nav className="flex items-center gap-1">
                            {primaryNavItems.map((item) => {
                                const isActive =
                                    item.href === '/investment'
                                        ? pathname === '/investment'
                                        : pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                                            isActive
                                                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        {item.name}
                                    </Link>
                                );
                            })}

                            {/* 更多 下拉群組 */}
                            <div
                                className="relative"
                                onMouseEnter={more.onEnter}
                                onMouseLeave={more.onLeave}
                            >
                                <button
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                                        isMoreActive
                                            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    更多
                                    <ChevronDownIcon
                                        size={11}
                                        className={`transition-transform duration-200 ${more.open ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {more.open && (
                                    <div className="absolute top-full left-0 mt-1.5 min-w-[7rem] rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg shadow-slate-200/40 dark:shadow-slate-950/40 py-1 z-50">
                                        {moreGroup.map((item) => {
                                            const isActive = pathname.startsWith(item.href.split('?')[0]);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`block px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                                                        isActive
                                                            ? 'text-blue-600 dark:text-blue-400 bg-blue-600/8'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* 觀察清單 + 裸K 下拉群組 */}
                            <div
                                className="relative"
                                onMouseEnter={watch.onEnter}
                                onMouseLeave={watch.onLeave}
                            >
                                <button
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                                        isWatchActive
                                            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    觀察清單
                                    <ChevronDownIcon
                                        size={11}
                                        className={`transition-transform duration-200 ${watch.open ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {watch.open && (
                                    <div className="absolute top-full left-0 mt-1.5 min-w-[7rem] rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg shadow-slate-200/40 dark:shadow-slate-950/40 py-1 z-50">
                                        {watchGroup.map((item) => {
                                            const isActive = pathname.startsWith(item.href);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`block px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                                                        isActive
                                                            ? 'text-blue-600 dark:text-blue-400 bg-blue-600/8'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {/* Back link */}
                        <Link
                            href="/cases"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 font-semibold"
                        >
                            <ArrowLeftIcon size={12} />
                            代書系統
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-screen-2xl mx-auto px-4 py-6 animate-fade-in">
                {children}
            </main>
        </div>
    );
}
