'use client';

import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export const SideNav = () => {
    const pathname = usePathname();
    const router = useRouter();
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh(); // Refresh to update auth state
    };

    return (
        <aside className="fixed left-6 top-6 bottom-6 w-20 hidden lg:flex flex-col items-center py-8 gap-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 dark:border-slate-800/50 rounded-[40px] shadow-2xl z-[999] transition-all hover:w-64 group">
            {/* Logo Area */}
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <span className="text-white font-black text-xl">S</span>
            </div>

            {/* Navigation Icons */}
            <nav className="flex-1 flex flex-col gap-3 w-full px-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-500 overflow-hidden ${isActive
                                ? 'bg-gradient-to-r from-blue-600/10 to-transparent text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            <span className="text-xl min-w-[24px]">{item.icon}</span>
                            <span className="font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Avatar / Logout */}
            <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-800 p-0.5 hover:rotate-12 transition-transform cursor-pointer"
                title="登出"
            >
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    登出
                </div>
            </button>
        </aside>
    );
};
