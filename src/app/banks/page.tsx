'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Search, Plus, Building2, User, Phone, Mail, FileText, Loader2, CreditCard, Database } from 'lucide-react';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';
import GenericExportExcelButton from '@/components/GenericExportExcelButton';
import { seedBankContacts } from '@/app/actions/banks';
// @ts-ignore
import bankData from '@/data/bank_contacts.json';

interface BankContact {
    id: string;
    bank_name: string;
    branch_name: string;
    contact_person: string;
    phone: string;
    email: string;
    loan_conditions: string;
    notes: string;
    updated_at: string;
}

export default function BanksPage() {
    const [banks, setBanks] = useState<BankContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBank, setSelectedBank] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBank, setCurrentBank] = useState<Partial<BankContact>>({});

    const bankColumns = [
        { header: '銀行名稱', key: 'bank_name', width: 20 },
        { header: '分行名稱', key: 'branch_name', width: 20 },
        { header: '聯絡人', key: 'contact_person', width: 15 },
        { header: '電話', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: '放款條件', key: 'loan_conditions', width: 40 },
        { header: '備註', key: 'notes', width: 30 },
    ];

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bank_contacts')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Supabase fetch error:', JSON.stringify(error, null, 2));
                throw error;
            }

            if (data && data.length > 0) {
                setBanks(data);
            } else {
                // If empty, seed from JSON
                console.log('Bank contacts empty, seeding from bankData:', bankData.length, 'records');
                const result = await seedBankContacts(bankData);
                console.log('Seed result:', result);

                if (result.success) {
                    const { data: newData } = await supabase
                        .from('bank_contacts')
                        .select('*')
                        .order('updated_at', { ascending: false });
                    setBanks(newData || []);
                } else {
                    console.error('Seed failed:', result.error);
                    setBanks([]);
                }
            }
        } catch (error: any) {
            console.error('Error fetching banks:', error.message || JSON.stringify(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('請先登入');
                return;
            }

            const dataToSave = {
                ...currentBank,
                updated_at: new Date().toISOString(),
                // user_id check by RLS
            };

            let error;
            if (currentBank.id) {
                const { error: updateError } = await supabase
                    .from('bank_contacts')
                    .update(dataToSave)
                    .eq('id', currentBank.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('bank_contacts')
                    .insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;

            setIsEditing(false);
            setCurrentBank({});
            fetchBanks();
        } catch (error: any) {
            console.error('Error saving:', error);
            alert('儲存失敗: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除此筆資料嗎？')) return;
        try {
            const { error } = await supabase
                .from('bank_contacts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchBanks();
        } catch (error: any) {
            console.error('Error deleting:', error);
            alert('刪除失敗');
        }
    };

    // --- Sidebar Logic ---
    const uniqueBanks = Array.from(new Set(banks.map(b => b.bank_name))).sort();

    const sidebarGroups: SidebarGroup[] = [
        {
            title: "合作銀行",
            items: uniqueBanks.map(bank => ({
                id: bank,
                label: bank,
                count: banks.filter(b => b.bank_name === bank).length,
                icon: <Building2 className="w-4 h-4" />
            }))
        }
    ];

    const filteredBanks = banks.filter(item => {
        const matchesSearch =
            item.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.branch_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBank = selectedBank ? item.bank_name === selectedBank : true;

        return matchesSearch && matchesBank;
    });

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <PageSidebar
                title="銀行通訊錄"
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
                                <span className="p-2.5 bg-sky-600 rounded-xl text-white shadow-lg shadow-sky-500/30">
                                    🤝
                                </span>
                                銀行資訊
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">
                                常用銀行窗口聯絡人、分行資訊與放款條件紀錄。
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-sky-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="搜尋銀行、分行或聯絡人..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-64 shadow-sm transition-all"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    setCurrentBank({});
                                    setIsEditing(true);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-xl shadow-slate-900/20 border border-slate-700/50 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">新增資料</span>
                            </button>

                            <GenericExportExcelButton
                                data={filteredBanks}
                                filename="銀行通訊錄"
                                sheetName="銀行資訊"
                                columns={bankColumns}
                            />
                        </div>
                    </div>

                    {/* Active Filter Mobile */}
                    {selectedBank && (
                        <div className="md:hidden flex items-center gap-2 bg-sky-50 text-sky-700 px-4 py-2 rounded-lg text-sm font-bold">
                            <span>已選銀行: {selectedBank}</span>
                            <button onClick={() => setSelectedBank(null)} className="ml-auto text-sky-400 hover:text-sky-700">清除</button>
                        </div>
                    )}

                    {/* Cards Grid */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                        </div>
                    ) : filteredBanks.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">沒有找到資料</h3>
                            <p className="text-slate-500 mt-2">請調整搜尋條件或新增資料</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredBanks.map((bank) => (
                                <div key={bank.id} className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-50 to-transparent opacity-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>

                                    <div className="relative z-10 flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                                                    {bank.bank_name}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">{bank.contact_person}</h3>
                                            <p className="text-sm text-slate-500 font-medium">{bank.branch_name}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCurrentBank(bank);
                                                setIsEditing(true);
                                            }}
                                            className="text-slate-300 hover:text-sky-600 transition-colors bg-white rounded-full p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3 relative z-10 flex-1">
                                        <div className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white group-hover:border-sky-100 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sky-600 shadow-sm border border-slate-100">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-slate-400 font-medium mb-0.5">聯絡電話</div>
                                                <div className="font-bold text-slate-700 truncate">{bank.phone}</div>
                                            </div>
                                        </div>

                                        {bank.email && (
                                            <div className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white group-hover:border-sky-100 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sky-600 shadow-sm border border-slate-100">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-slate-400 font-medium mb-0.5">電子郵件</div>
                                                    <div className="font-medium text-slate-700 truncate">{bank.email}</div>
                                                </div>
                                            </div>
                                        )}

                                        {(bank.loan_conditions || bank.notes) && (
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                {bank.loan_conditions && (
                                                    <div className="mb-2">
                                                        <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded inline-block mb-1">放款條件</div>
                                                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{bank.loan_conditions}</p>
                                                    </div>
                                                )}
                                                {bank.notes && (
                                                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic">{bank.notes}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800">
                                {currentBank.id ? '編輯銀行資訊' : '新增銀行資訊'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">銀行名稱</label>
                                    <input
                                        type="text"
                                        value={currentBank.bank_name || ''}
                                        onChange={(e) => setCurrentBank({ ...currentBank, bank_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-bold"
                                        placeholder="例如：中國信託"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">分行名稱</label>
                                    <input
                                        type="text"
                                        value={currentBank.branch_name || ''}
                                        onChange={(e) => setCurrentBank({ ...currentBank, branch_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-bold"
                                        placeholder="例如：信義分行"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">聯絡人</label>
                                    <input
                                        type="text"
                                        value={currentBank.contact_person || ''}
                                        onChange={(e) => setCurrentBank({ ...currentBank, contact_person: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                        placeholder="姓名"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">電話</label>
                                    <input
                                        type="text"
                                        value={currentBank.phone || ''}
                                        onChange={(e) => setCurrentBank({ ...currentBank, phone: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                        placeholder="手機或分機"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">Email</label>
                                <input
                                    type="email"
                                    value={currentBank.email || ''}
                                    onChange={(e) => setCurrentBank({ ...currentBank, email: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                    placeholder="contact@bank.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">放款條件</label>
                                <textarea
                                    value={currentBank.loan_conditions || ''}
                                    onChange={(e) => setCurrentBank({ ...currentBank, loan_conditions: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                    placeholder="成數、利率等..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">備註</label>
                                <textarea
                                    value={currentBank.notes || ''}
                                    onChange={(e) => setCurrentBank({ ...currentBank, notes: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                    placeholder="其他說明..."
                                />
                            </div>

                            <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100">
                                {currentBank.id ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(currentBank.id!)}
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
                                        className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all hover:shadow-lg active:scale-95"
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
