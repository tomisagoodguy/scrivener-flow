'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';

const navItems = [
    { name: '選股池', href: '/investment' },
    { name: '裸K看盤', href: '/investment/bare-k' },
    { name: '法人共識', href: '/investment/consensus' },
    { name: 'ETF 對比', href: '/investment/compare' },
    { name: '歷史回顧', href: '/investment/history' },
    { name: '營收實驗室', href: '/investment/revenue-lab' },
    { name: '觀察清單', href: '/investment/watch-list' },
    { name: '籌碼排行', href: '/investment/equity' },
    { name: '模式分析', href: '/investment/buying-patterns' },
];

export default function InvestmentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

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
                <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
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
                            {navItems.map((item) => {
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
            <main className="max-w-screen-2xl mx-auto px-6 py-6 animate-fade-in">
                {children}
            </main>
        </div>
    );
}
