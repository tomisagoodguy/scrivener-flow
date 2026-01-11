import Link from 'next/link';
import { FC } from 'react';
import ThemeToggle from './ThemeToggle';

export const Header: FC = () => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 animate-fade-in gap-4">
            <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                    Overview
                </h1>
                <p className="text-foreground/60 mt-2 text-lg">不動產案件進度追蹤系統</p>
            </div>
            <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link href="/cases/new" className="glass px-6 py-3 rounded-full hover:bg-primary/10 transition-all flex items-center gap-2 group cursor-pointer active:scale-95 duration-200 shadow-sm border border-border-color">
                    <span className="bg-gradient-to-tr from-primary to-primary-deep rounded-full w-5 h-5 flex items-center justify-center text-xs text-white group-hover:scale-110 transition-transform font-bold">
                        +
                    </span>
                    <span className="font-bold text-foreground">新增案件</span>
                </Link>
            </div>
        </header>
    );
};
