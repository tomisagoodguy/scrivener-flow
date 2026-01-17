'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Search, Plus, Building2, Globe, Clock, Phone, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';

import GenericExportExcelButton from '@/components/GenericExportExcelButton';

interface RedemptionInfo {
    id: string;
    bank_name: string;
    service_phone: string;
    account_info: string;
    lead_time: string;
    notes: string;
    updated_at: string;
}

export default function RedemptionsPage() {
    const [redemptions, setRedemptions] = useState<RedemptionInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBank, setSelectedBank] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentData, setCurrentData] = useState<Partial<RedemptionInfo>>({});

    const redemptionColumns = [
        { header: '銀行名稱', key: 'bank_name', width: 25 },
        { header: '服務電話', key: 'service_phone', width: 20 },
        { header: '作業時間', key: 'lead_time', width: 20 },
        { header: '匯款帳號', key: 'account_info', width: 30 },
        { header: '備註', key: 'notes', width: 30 },
    ];
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        fetchRedemptions();
    }, []);

    const fetchRedemptions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bank_redemptions')
                .select('*')
                .order('bank_name', { ascending: true });

            if (error) throw error;
            setRedemptions(data || []);
        } catch (error) {
            console.error('Error fetching redemptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                alert('請先登入');
                return;
            }

            const dataToSave = {
                ...currentData,
                updated_at: new Date().toISOString(),
                // user_id check is handled by RLS, but strictly we might need to ensure user has right
            };

            let error;
            if (currentData.id) {
                const { error: updateError } = await supabase
                    .from('bank_redemptions')
                    .update(dataToSave)
                    .eq('id', currentData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('bank_redemptions')
                    .insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;

            setIsEditing(false);
            setCurrentData({});
            fetchRedemptions();
        } catch (error: any) {
            console.error('Error saving:', error);
            alert('儲存失敗: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除此筆資料嗎？')) return;

        try {
            const { error } = await supabase
                .from('bank_redemptions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchRedemptions();
        } catch (error: any) {
            console.error('Error deleting:', error);
            alert('刪除失敗');
        }
    };

    // --- Sidebar & Filtering Logic ---
    const uniqueBanks = Array.from(new Set(redemptions.map(r => r.bank_name))).sort();

    // Group banks? For now, just a list. Maybe group by first char if needed later.
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

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
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
                                <div key={item.id} className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                                {item.bank_name.charAt(0)}
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-800">{item.bank_name}</h3>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCurrentData(item);
                                                setIsEditing(true);
                                            }}
                                            className="text-slate-300 hover:text-indigo-600 transition-colors"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        {item.service_phone && (
                                            <div className="flex gap-3 items-start">
                                                <Phone className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                                <div className="text-sm">
                                                    <div className="text-slate-500 text-xs mb-0.5">服務電話</div>
                                                    <div className="font-medium text-slate-700">{item.service_phone}</div>
                                                </div>
                                            </div>
                                        )}

                                        {item.lead_time && (
                                            <div className="flex gap-3 items-start">
                                                <Clock className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                                <div className="text-sm">
                                                    <div className="text-slate-500 text-xs mb-0.5">作業天數</div>
                                                    <div className="font-medium text-slate-700">{item.lead_time}</div>
                                                </div>
                                            </div>
                                        )}

                                        {item.account_info && (
                                            <div className="flex gap-3 items-start">
                                                <Globe className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                                <div className="text-sm">
                                                    <div className="text-slate-500 text-xs mb-0.5">匯款/帳號資訊</div>
                                                    <div className="font-medium text-slate-700 whitespace-pre-line">{item.account_info}</div>
                                                </div>
                                            </div>
                                        )}

                                        {item.notes && (
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <p className="text-sm text-slate-500 leading-relaxed">{item.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Modal (Keeping original structure but styled) */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800">
                                {currentData.id ? '編輯代償資訊' : '新增代償資訊'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">銀行名稱</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={currentData.bank_name || ''}
                                        onChange={(e) => {
                                            setCurrentData({ ...currentData, bank_name: e.target.value });
                                            setShowSuggestions(true);
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                                        placeholder="輸入銀行名稱"
                                        required
                                    />
                                    {/* Simple suggestion logic could be added here if needed */}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">服務電話</label>
                                    <input
                                        type="text"
                                        value={currentData.service_phone || ''}
                                        onChange={(e) => setCurrentData({ ...currentData, service_phone: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">作業天數</label>
                                    <input
                                        type="text"
                                        value={currentData.lead_time || ''}
                                        onChange={(e) => setCurrentData({ ...currentData, lead_time: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">匯款/帳號資訊</label>
                                <textarea
                                    value={currentData.account_info || ''}
                                    onChange={(e) => setCurrentData({ ...currentData, account_info: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="銀行代碼、帳號等..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">備註</label>
                                <textarea
                                    value={currentData.notes || ''}
                                    onChange={(e) => setCurrentData({ ...currentData, notes: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100">
                                {currentData.id ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(currentData.id!)}
                                        className="text-rose-500 hover:text-rose-600 text-sm font-medium px-2 py-1 hover:bg-rose-50 rounded"
                                    >
                                        刪除
                                    </button>
                                ) : <div></div>}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-all hover:shadow-lg active:scale-95"
                                    >
                                        儲存
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}