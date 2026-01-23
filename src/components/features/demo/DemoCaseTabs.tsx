'use client';

import React from 'react';
import { DemoCase } from '@/types';

interface DemoCaseTabsProps {
    cases: DemoCase[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

export function DemoCaseTabs({ cases, selectedIndex, onSelect }: DemoCaseTabsProps) {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-[#f3f3f3] dark:bg-[#1a1a1a] border-t border-[#ccc] dark:border-[#333] h-10 flex items-stretch z-50">
            <div className="flex items-center px-4 border-r border-[#ccc] dark:border-[#333] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001 1h2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
            </div>

            <div className="flex-1 flex overflow-x-auto excel-scrollbar">
                {cases.map((c, i) => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(i)}
                        className={`flex items-center px-6 min-w-[140px] max-w-[240px] border-r border-[#ccc] dark:border-[#333] text-[11px] font-bold transition-all relative ${selectedIndex === i
                                ? 'bg-white dark:bg-[#1e293b] text-primary shadow-[inset_0_-3px_0_var(--primary)]'
                                : 'text-[var(--foreground)] opacity-50 hover:bg-white/50 dark:hover:bg-white/5'
                            }`}
                    >
                        <span className="truncate">
                            {c.case_number} - {c.buyer_name}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex items-center px-4 border-l border-[#ccc] dark:border-[#333] bg-primary text-white text-[9px] font-black uppercase tracking-widest">
                MASTER WORKBOOK
            </div>

            <style jsx>{`
                .excel-scrollbar::-webkit-scrollbar {
                    height: 4px;
                }
                .excel-scrollbar::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 10px;
                }
            `}</style>
        </footer>
    );
}
