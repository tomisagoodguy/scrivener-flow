'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function ThemeToggler() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTheme();
                }
            }}
            aria-label={theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
            aria-pressed={theme === 'dark'}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-dark-primary focus:ring-offset-2"
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-500 transition-transform duration-200" />
            ) : (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform duration-200" />
            )}
        </button>
    );
}
