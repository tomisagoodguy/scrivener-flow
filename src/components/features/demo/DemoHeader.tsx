'use client';

import React from 'react';

interface DemoHeaderProps {
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onAddCase: () => void;
}

export function DemoHeader({ theme, onToggleTheme, onAddCase }: DemoHeaderProps) {
    return (
        <header className="bg-[#1a1a1a] dark:bg-[#0f172a] text-white p-3 flex items-center justify-between border-b border-black/20">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="bg-green-600 px-2 py-0.5 rounded text-[10px] font-bold">EXCEL</div>
                    <span className="font-bold text-sm tracking-tight text-slate-300">案件進度管理系統 v2.0</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                <div className="hidden md:flex gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <span>File</span>
                    <span>Edit</span>
                    <span>View</span>
                    <span className="text-primary-foreground/80">Data Analysis</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={onToggleTheme} className="text-xl opacity-70 hover:opacity-100 transition">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button
                    onClick={onAddCase}
                    className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded transition uppercase"
                >
                    Add Case
                </button>
            </div>
        </header>
    );
}
