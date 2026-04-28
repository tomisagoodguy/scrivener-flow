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

    // 初始化：從 localStorage 讀取主題偏好，並執行下午 4 點自動變黑的貼心功能
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('theme') as Theme | null;
        const lastAutoSwitch = localStorage.getItem('last_auto_theme_switch');
        const now = new Date();
        const todayDate = now.toDateString();
        const currentHour = now.getHours();
        
        // 判斷是否為下午 4 點 (16:00) 之後
        const isAfter4PM = currentHour >= 16;
        
        // 策略：如果現在超過下午 4 點，且「今天尚未自動切換過」，則強制切換為深色模式
        if (isAfter4PM && lastAutoSwitch !== todayDate) {
            console.log('🌙 It is after 4 PM. Auto-switching to Dark Mode for your comfort.');
            setThemeState('dark');
            localStorage.setItem('last_auto_theme_switch', todayDate);
            // 記得同時更新 stored theme，這樣如果使用者之後沒改，下次進來還是 dark
            localStorage.setItem('theme', 'dark');
        } else if (stored && (stored === 'light' || stored === 'dark')) {
            // 如果不需要自動切換 (或已經切過)，則尊重使用者的設定
            setThemeState(stored);
        }
        // 若完全沒設定且未達自動切換時間，預設為 State 的初始值 'light'
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

    return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
