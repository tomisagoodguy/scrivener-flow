import Link from 'next/link';
import { FC } from 'react';

export const Header: FC = () => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 animate-fade-in gap-4">
            <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Overview
                </h1>
                <p className="text-slate-400 mt-2 text-lg">不動產案件進度追蹤系統</p>
            </div>
            <Link href="/cases/new" className="glass px-6 py-3 rounded-full hover:bg-white/10 transition-colors flex items-center gap-2 group cursor-pointer active:scale-95 duration-200">
                <span className="bg-primary rounded-full w-5 h-5 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                    +
                </span>
                <span className="font-medium text-slate-200">新增案件</span>
            </Link>
        </header>
    );
};
