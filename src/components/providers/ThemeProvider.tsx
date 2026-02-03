'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    // 初始化：從 localStorage 讀取主題偏好
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored && (stored === 'light' || stored === 'dark')) {
            setThemeState(stored);
        }
    }, []);

    // 🔥 關鍵修復：當 theme 狀態改變時，立即同步到 DOM
    useEffect(() => {
        if (!mounted) return;

        console.log('🔄 Applying theme to DOM:', theme);
        
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
        }

        // 同步到 localStorage
        localStorage.setItem('theme', theme);
        
        console.log('✅ DOM updated. HTML classes:', document.documentElement.className);
    }, [theme, mounted]);

    const setTheme = (newTheme: Theme) => {
        console.log('📝 setTheme called:', newTheme);
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        console.log('🔀 toggleTheme:', theme, '→', newTheme);
        setThemeState(newTheme);
    };

    // 避免 hydration mismatch：首次渲染時不顯示會受主題影響的內容
    if (!mounted) {
        return <>{children}</>;
    }

    return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
