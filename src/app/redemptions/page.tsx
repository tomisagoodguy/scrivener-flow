'use client';

import React, { useState } from 'react';
import { Search, Plus, Building2, Loader2 } from 'lucide-react';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';
import GenericExportExcelButton from '@/components/features/cases/GenericExportExcelButton';

import { useRedemptions } from '@/components/features/redemptions/useRedemptions';
import { RedemptionCard } from '@/components/features/redemptions/RedemptionCard';
import { RedemptionEditModal } from '@/components/features/redemptions/RedemptionEditModal';

export default function RedemptionsPage() {
    const {
        redemptions,
        loading,
        isEditing,
        setIsEditing,
        currentData,
        setCurrentData,
        handleSave,
        handleDelete
    } = useRedemptions();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBank, setSelectedBank] = useState<string | null>(null);

    const redemptionColumns = [
        { header: '銀行名稱', key: 'bank_name', width: 25 },
        { header: '服務電話', key: 'service_phone', width: 20 },
        { header: '作業時間', key: 'lead_time', width: 20 },
        { header: '匯款帳號', key: 'account_info', width: 30 },
        { header: '備註', key: 'notes', width: 30 },
    ];

    // --- Sidebar & Filtering Logic ---
    const uniqueBanks = Array.from(new Set(redemptions.map(r => r.bank_name))).sort();

    const sidebarGroups: SidebarGroup[] = [
        {
            title: "依銀行瀏覽",
            items: uniqueBanks.map(bank => ({
                id: bank,
                label: bank,
                count: redemptions.filter(r => r.bank_name === bank).length,
                icon: <Building2 className="w-4 h-4" />
            }))
        }
    ];

    const filteredRedemptions = redemptions.filter(item => {
        const matchesSearch =
            item.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesBank = selectedBank ? item.bank_name === selectedBank : true;

        return matchesSearch && matchesBank;
    });

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <PageSidebar
                title="代償銀行目錄"
                groups={sidebarGroups}
                selectedId={selectedBank}
                onSelect={setSelectedBank}
                className="hidden md:block shadow-sm z-10"
            />

            <main className="flex-1 p-6 md:p-12">
                <div className="max-w-6xl mx-auto space-y-8 pb-20">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <span className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                                    🏦
                                </span>
                                代償資訊
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">
                                收錄各家銀行的代償窗口、作業時間與匯款帳號資訊。
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    全團隊共用資料庫・即時同步
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="搜尋銀行或備註..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 shadow-sm transition-all"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    setCurrentData({});
                                    setIsEditing(true);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-xl shadow-slate-900/20 border border-slate-700/50 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">新增資料</span>
                            </button>

                            <GenericExportExcelButton
                                data={filteredRedemptions}
                                filename="代償資訊表"
                                sheetName="代償資訊"
                                columns={redemptionColumns}
                            />
                        </div>
                    </div>

                    {/* Active Filter Mobile */}
                    {selectedBank && (
                        <div className="md:hidden flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold">
                            <span>已選銀行: {selectedBank}</span>
                            <button onClick={() => setSelectedBank(null)} className="ml-auto text-indigo-400 hover:text-indigo-700">清除</button>
                        </div>
                    )}

                    {/* Cards Grid */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : filteredRedemptions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">沒有找到資料</h3>
                            <p className="text-slate-500 mt-2">請調整搜尋條件或新增資料</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRedemptions.map((item) => (
                                <RedemptionCard
                                    key={item.id}
                                    item={item}
                                    setCurrentData={setCurrentData}
                                    setIsEditing={setIsEditing}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Modal */}
            <RedemptionEditModal
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                currentData={currentData}
                setCurrentData={setCurrentData}
                handleSave={handleSave}
                handleDelete={handleDelete}
            />
        </div>
    );
}