'use client';

import React, { useState } from 'react';
import { Search, Plus, Database, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useBanksData } from '@/components/features/banks/useBanksData';
import { BankEditModal } from '@/components/features/banks/BankEditModal';
import { BankSidebar } from '@/components/features/banks/BankSidebar';
import { BankListCard } from '@/components/features/banks/BankListCard';

export default function BanksPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const {
        banks,
        isLoading,
        isDbMode,
        isEditing,
        currentBank,
        setCurrentBank,
        setIsEditing,
        fetchBanks,
        handleSave,
        handleDelete,
        startEdit,
        addContact,
        updateContact,
        removeContact,
    } = useBanksData();

    const filteredBanks = banks.filter(b =>
        b.name.includes(searchTerm) ||
        JSON.stringify(b.contacts).includes(searchTerm) ||
        b.loan_conditions?.includes(searchTerm)
    );

    const scrollToBank = (bankId: string) => {
        const element = document.getElementById(`bank-${bankId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (isEditing) {
        return (
            <BankEditModal
                currentBank={currentBank}
                setCurrentBank={setCurrentBank}
                setIsEditing={setIsEditing}
                handleSave={handleSave}
                addContact={addContact}
                updateContact={updateContact}
                removeContact={removeContact}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B1120]">
            <main className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in pb-32">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="bg-slate-200 dark:bg-slate-800 p-2 rounded-2xl">🏦</span>
                            銀行資訊中心
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium flex items-center flex-wrap gap-2">
                            管理各家銀行代償流程、放款條件與聯絡窗口
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold ring-1 ring-blue-500/20"><Users size={12} /> 全團隊即時共享</span>
                            {!isDbMode && !isLoading && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">唯讀模式 (使用本地資料)</span>}
                            {isDbMode && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">已連接資料庫</span>}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="搜尋銀行、聯絡人..."
                                className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-64 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {isDbMode && (
                            <button
                                onClick={() => startEdit()}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                                <Plus size={18} />
                                新增銀行
                            </button>
                        )}
                        {isDbMode && (
                            <button
                                onClick={async () => {
                                    if (!confirm('這將會把本地的聯絡人資料合併到資料庫中。現有的資料不會被刪除，但空白欄位會被補齊。確定要執行嗎？')) return;
                                    const toastId = toast.loading('資料還原中...');
                                    try {
                                        const res = await fetch('/api/migrations/seed-banks');
                                        const result = await res.json();
                                        if (res.ok) {
                                            toast.success(`還原成功！(更新: ${result.stats.updated}, 新增: ${result.stats.inserted})`, { id: toastId });
                                            fetchBanks();
                                        } else {
                                            throw new Error(result.error);
                                        }
                                    } catch (e: any) {
                                        toast.error('還原失敗: ' + e.message, { id: toastId });
                                    }
                                }}
                                className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-300 transition-all flex items-center gap-2"
                            >
                                <Database size={18} />
                                還原預設資料
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin text-blue-600">Loading...</div>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Sidebar Directory */}
                        <BankSidebar
                            filteredBanks={filteredBanks}
                            scrollToBank={scrollToBank}
                        />

                        {/* Main Bank List */}
                        <div className="flex-1 grid grid-cols-1 gap-6 min-w-0">
                            {filteredBanks.map((bank) => (
                                <BankListCard
                                    key={bank.id}
                                    bank={bank}
                                    isDbMode={isDbMode}
                                    startEdit={startEdit}
                                    handleDelete={handleDelete}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
