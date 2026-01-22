import React from 'react';
import { Database } from 'lucide-react';

interface BankSidebarProps {
    filteredBanks: any[]; // Replace 'any' with Bank type if available
    scrollToBank: (id: string) => void;
}

export function BankSidebar({ filteredBanks, scrollToBank }: BankSidebarProps) {
    return (
        <div className="hidden lg:block w-64 sticky top-24 shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Database size={12} />
                    銀行目錄 ({filteredBanks.length})
                </h3>
                <div className="space-y-1">
                    {filteredBanks.map(bank => (
                        <button
                            key={bank.id}
                            onClick={() => scrollToBank(bank.id)}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 transition-colors truncate"
                        >
                            {bank.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
