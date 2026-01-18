'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="p-2 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;
    }

    return (
        <button
            onClick={toggleTheme}
            className="p-2.5 w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm border border-slate-200/40 dark:border-slate-700/40"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? (
                <Moon size={20} className="fill-slate-600 transition-transform hover:rotate-12" />
            ) : (
                <Sun size={20} className="fill-amber-400 text-amber-400 transition-transform hover:rotate-45" />
            )}
        </button>
    );
}
