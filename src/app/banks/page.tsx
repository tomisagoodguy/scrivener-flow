'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BANK_CONTACTS, BANK_REDEMPTION_INFO } from '@/data/bankData'; // Keep as fallback/seed
import { Phone, MapPin, FileText, Clock, User, Mail, CreditCard, ExternalLink, Search, Copy, Plus, Edit, Save, Trash2, Database, Users } from 'lucide-react';
import { Bank } from '@/types';
import { toast } from 'sonner';

export default function BanksPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [banks, setBanks] = useState<Bank[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDbMode, setIsDbMode] = useState(false); // Track if we are using Supabase

    // Edit/Add Mode
    const [isEditing, setIsEditing] = useState(false);
    const [currentBank, setCurrentBank] = useState<Partial<Bank>>({});

    const supabase = createClient();

    // Initial Fetch
    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        setIsLoading(true);

        // 1. Get Local Data (Seed)
        const localBanks = generateLocalBanks();
        const bankMap = new Map<string, Bank>();

        // Initialize map with local data
        localBanks.forEach(b => bankMap.set(b.name, b));

        try {
            // 2. Fetch DB Data (User Overrides/Additions)
            const { data, error } = await supabase
                .from('banks')
                .select('*')
                .order('name', { ascending: true });

            if (data) {
                data.forEach(dbBank => {
                    // Overwrite local data with DB data if name matches
                    // This ensures we keep the UUID and any edits
                    bankMap.set(dbBank.name, dbBank);
                });
                setIsDbMode(true);
            } else if (error) {
                console.warn("Supabase fetch error:", error.message);
                // Fallback to local only mode if DB fails hard
                setIsDbMode(false);
            }
        } catch (e) {
            console.error("Fetch failed:", e);
            setIsDbMode(false);
        } finally {
            // 3. Set Final State
            const finalBanks = Array.from(bankMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
            setBanks(finalBanks);
            setIsLoading(false);
        }
    };

    const generateLocalBanks = (): Bank[] => {
        // Collect all unique bank names from both sources
        const contactBanks = BANK_CONTACTS.map(c => (c as any).credit_system || c.bank_name);
        const redemptionBanks = BANK_REDEMPTION_INFO.map(r => r.bank_name);
        const allNames = Array.from(new Set([...contactBanks, ...redemptionBanks])).filter(Boolean).sort();

        return allNames.map(name => {
            const r = BANK_REDEMPTION_INFO.find(i => i.bank_name === name);
            // Match contacts by credit_system (from JSON) or bank_name (if standardized)
            const relatedContacts = BANK_CONTACTS.filter(c =>
                ((c as any).credit_system === name) || (c.bank_name === name)
            );

            return {
                id: `local-${name}`, // Temporary ID for non-DB items
                name: name,
                loan_conditions: '',
                redemption_phone: r?.phone || '',
                redemption_account: r?.account_info || '',
                redemption_days: r?.processing_days || '',
                redemption_location: r?.pickup_location || '',
                redemption_note: [r?.requirements, r?.notes].filter(Boolean).join('\n'),
                contacts: relatedContacts,
            };
        });
    };

    const handleSave = async () => {
        if (!currentBank.name) {
            alert('銀行名稱為必填');
            return;
        }

        if (!isDbMode) {
            alert('目前為唯讀模式（尚未連接資料庫 table）。請先建立 banks 資料表。');
            return;
        }

        try {
            const payload = {
                name: currentBank.name,
                branch: currentBank.branch,
                loan_conditions: currentBank.loan_conditions,
                redemption_phone: currentBank.redemption_phone,
                redemption_account: currentBank.redemption_account,
                redemption_days: currentBank.redemption_days,
                redemption_location: currentBank.redemption_location,
                redemption_note: currentBank.redemption_note,
                contacts: currentBank.contacts || [],
            };

            // If ID exists AND it's a real UUID (not our local- fake id), update.
            // Otherwise, insert as new.
            if (currentBank.id && !currentBank.id.startsWith('local-')) {
                // Update
                const { error } = await supabase.from('banks').update(payload).eq('id', currentBank.id);
                if (error) throw error;
            } else {
                // Insert (New or Migrating local item)
                const { error } = await supabase.from('banks').insert([payload]);
                if (error) throw error;
            }

            setIsEditing(false);
            setCurrentBank({});
            fetchBanks(); // Refresh
            toast.success('儲存成功');
        } catch (e: any) {
            alert('儲存失敗: ' + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這筆銀行資料嗎？')) return;
        if (!isDbMode) return;

        const { error } = await supabase.from('banks').delete().eq('id', id);
        if (error) {
            alert('刪除失敗');
        } else {
            fetchBanks();
        }
    };

    const startEdit = (bank?: Bank) => {
        if (bank) {
            setCurrentBank(bank);
        } else {
            setCurrentBank({
                name: '',
                contacts: [],
            });
        }
        setIsEditing(true);
    };

    // --- Actions for Contacts Editor ---
    const addContact = () => {
        const newContacts = [...(currentBank.contacts || []), { name: '', branch: '', phone: '', email: '' }];
        setCurrentBank({ ...currentBank, contacts: newContacts });
    };

    const updateContact = (index: number, field: string, value: string) => {
        const newContacts = [...(currentBank.contacts || [])];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setCurrentBank({ ...currentBank, contacts: newContacts });
    };

    const removeContact = (index: number) => {
        const newContacts = [...(currentBank.contacts || [])];
        newContacts.splice(index, 1);
        setCurrentBank({ ...currentBank, contacts: newContacts });
    };

    const scrollToBank = (bankId: string) => {
        const element = document.getElementById(`bank-${bankId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // --- Search Filter ---
    const filteredBanks = banks.filter(b =>
        b.name.includes(searchTerm) ||
        JSON.stringify(b.contacts).includes(searchTerm) ||
        b.loan_conditions?.includes(searchTerm)
    );

    if (isEditing) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 z-[100] fixed inset-0 overflow-y-auto">
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 animate-fade-in relative ring-1 ring-slate-900/5">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4 sticky top-0 bg-white dark:bg-slate-800 z-10 pt-2">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            {currentBank.id ? <Edit className="text-blue-500" /> : <Plus className="text-blue-500" />}
                            {currentBank.id ? '編輯銀行資訊' : '新增銀行資料'}
                        </h2>
                        <button onClick={() => setIsEditing(false)} className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors pointer-events-auto">✕</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Basic Info */}
                        <div className="space-y-5">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-4 border-blue-500 pl-3">基本資料</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">銀行名稱 <span className="text-red-500">*</span></label>
                                    <input
                                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-bold focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        value={currentBank.name || ''}
                                        onChange={e => setCurrentBank({ ...currentBank, name: e.target.value })}
                                        placeholder="例如：台北富邦"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">分行</label>
                                    <input
                                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        value={currentBank.branch || ''}
                                        onChange={e => setCurrentBank({ ...currentBank, branch: e.target.value })}
                                        placeholder="選填"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Redemption Info */}
                        <div className="space-y-5">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-4 border-purple-500 pl-3">代償/塗銷資料</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                    value={currentBank.redemption_phone || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, redemption_phone: e.target.value })}
                                    placeholder="客服電話"
                                />
                                <input
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                    value={currentBank.redemption_days || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, redemption_days: e.target.value })}
                                    placeholder="工作天數"
                                />
                                <input
                                    className="col-span-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                    value={currentBank.redemption_account || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, redemption_account: e.target.value })}
                                    placeholder="匯款專戶帳號"
                                />
                                <input
                                    className="col-span-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                    value={currentBank.redemption_location || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, redemption_location: e.target.value })}
                                    placeholder="領取地點"
                                />
                            </div>
                        </div>

                        {/* Contacts Editor - Visual Form */}
                        <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-end">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-4 border-green-500 pl-3">聯絡窗口名單</h3>
                                <button type="button" onClick={addContact} className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors">
                                    <Plus size={14} /> 新增窗口
                                </button>
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl max-h-[300px] overflow-y-auto">
                                {!currentBank.contacts?.length && (
                                    <div className="text-center text-slate-400 py-4 text-sm">目前沒有聯絡人，請點擊上方按鈕新增。</div>
                                )}
                                {currentBank.contacts?.map((contact: any, index: number) => (
                                    <div key={index} className="flex gap-2 items-start bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                                            <input
                                                placeholder="姓名"
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                                                value={contact.name || ''}
                                                onChange={e => updateContact(index, 'name', e.target.value)}
                                            />
                                            <input
                                                placeholder="分行/職稱"
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                                                value={contact.branch || ''}
                                                onChange={e => updateContact(index, 'branch', e.target.value)}
                                            />
                                            <input
                                                placeholder="電話/分機"
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                                                value={contact.phone || ''}
                                                onChange={e => updateContact(index, 'phone', e.target.value)}
                                            />
                                            <input
                                                placeholder="Email"
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                                                value={contact.email || ''}
                                                onChange={e => updateContact(index, 'email', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeContact(index)}
                                            className="text-slate-400 hover:text-red-500 p-2"
                                            title="刪除"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Loan Conditions */}
                        <div className="col-span-1 md:col-span-2 space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                                <FileText size={16} /> 貸款條件與規則備註
                            </h3>
                            <textarea
                                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all font-mono text-sm leading-relaxed"
                                rows={8}
                                value={currentBank.loan_conditions || ''}
                                onChange={e => setCurrentBank({ ...currentBank, loan_conditions: e.target.value })}
                                placeholder={`輸入詳細規則...\n1. 首購成數限制...\n2. 寬限期規定...\n3. 特殊案件處理方式...`}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 rounded-xl font-black bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Save size={18} />
                            儲存資料
                        </button>
                    </div>
                </div>
            </div>
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
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin text-blue-600">Loading...</div>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Sidebar Directory */}
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

                        {/* Main Bank List */}
                        <div className="flex-1 grid grid-cols-1 gap-6 min-w-0">
                            {filteredBanks.map((bank) => (
                                <div key={bank.id} id={`bank-${bank.id}`} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group scroll-mt-24">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
                                                {bank.name.substring(0, 1)}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                    {bank.name}
                                                    {bank.branch && <span className="text-sm font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 rounded-full">{bank.branch}</span>}
                                                </h2>
                                                <div className="flex gap-4 mt-1">
                                                    {bank.redemption_phone && (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                                            <Phone size={12} /> {bank.redemption_phone} (客服)
                                                        </span>
                                                    )}
                                                    {bank.contacts?.length ? (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 rounded">
                                                            <User size={12} /> 共 {bank.contacts.length} 位窗口
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        {isDbMode && (
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(bank)}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(bank.id)}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Main Content Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                                        {/* Contacts (Prioritized) */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <User size={14} className="text-green-500" />
                                                聯絡窗口通訊錄
                                            </h3>

                                            {bank.contacts && bank.contacts.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {bank.contacts.map((c: any, idx: number) => (
                                                        <div key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg flex flex-col gap-1.5 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors group/contact">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                                                                    {c.branch && <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-900 px-1.5 rounded">{c.branch}</span>}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-1 pl-1">
                                                                {c.phone && (
                                                                    <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                                                        <Phone size={12} className="text-slate-400" />
                                                                        {c.phone}
                                                                    </div>
                                                                )}
                                                                {c.email && (
                                                                    <div className="text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2 select-all">
                                                                        <Mail size={12} className="text-slate-400" />
                                                                        {c.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-slate-400 text-sm italic py-2">
                                                    尚無聯絡人資料
                                                </div>
                                            )}

                                            {/* Loan Conditions */}
                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                                    <Users size={14} />
                                                    全團隊共享備註 (貸款條件)
                                                </h3>
                                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-dashed border-amber-200 dark:border-amber-800/30">
                                                    {bank.loan_conditions ? (
                                                        <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                            {bank.loan_conditions}
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-400 text-sm italic">
                                                            尚無共享備註
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Redemption Info */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <CreditCard size={14} className="text-purple-500" />
                                                代償與塗銷資訊
                                            </h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                <InfoItem label="匯款專戶" value={bank.redemption_account} icon={<CreditCard size={12} />} />
                                                <InfoItem label="處理天數" value={bank.redemption_days} icon={<Clock size={12} />} />
                                                <InfoItem label="領取地點" value={bank.redemption_location} icon={<MapPin size={12} />} />
                                                <InfoItem label="注意事項" value={bank.redemption_note} icon={<FileText size={12} />} fullWidth />
                                            </div>

                                            {/* Quick Actions/Info */}
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300 mt-4">
                                                <div className="bg-blue-100 dark:bg-blue-800 p-1 rounded-full shrink-0">
                                                    <Phone size={12} />
                                                </div>
                                                <div>
                                                    <div className="font-bold mb-0.5">銀行客服代表號</div>
                                                    <div className="font-mono text-sm">{bank.redemption_phone || '未提供'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const InfoItem = ({ label, value, icon, fullWidth }: any) => {
    if (!value) return null;
    return (
        <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 ${fullWidth ? 'col-span-2' : ''}`}>
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1.5">
                {icon}
                {label}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-all">
                {value}
            </div>
        </div>
    );
};
