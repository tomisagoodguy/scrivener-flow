'use client';

import React, { useState } from 'react';
import { Phone, MapPin, FileText, Clock, User, Mail, CreditCard, Search, Copy, Plus, Edit, Trash2, Database, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useBanksData } from '@/components/features/banks/useBanksData';
import { BankEditModal } from '@/components/features/banks/BankEditModal';
import { InfoItem } from '@/components/features/banks/InfoItem';

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
                                                    {(() => {
                                                        const expandedContacts: Array<{
                                                            name: string;
                                                            branch: string;
                                                            phone: string;
                                                            email: string;
                                                            isMultiple: boolean;
                                                            emailIndex: number;
                                                        }> = [];

                                                        bank.contacts.forEach((c: any) => {
                                                            if (c.email) {
                                                                const emails = c.email.split(/[,;]/).map((e: string) => e.trim()).filter(Boolean);
                                                                if (emails.length > 1) {
                                                                    emails.forEach((email: string, idx: number) => {
                                                                        expandedContacts.push({
                                                                            name: c.name,
                                                                            branch: c.branch,
                                                                            phone: c.phone,
                                                                            email: email,
                                                                            isMultiple: true,
                                                                            emailIndex: idx + 1
                                                                        });
                                                                    });
                                                                } else {
                                                                    expandedContacts.push({
                                                                        name: c.name,
                                                                        branch: c.branch,
                                                                        phone: c.phone,
                                                                        email: emails[0],
                                                                        isMultiple: false,
                                                                        emailIndex: 0
                                                                    });
                                                                }
                                                            } else {
                                                                expandedContacts.push({
                                                                    name: c.name,
                                                                    branch: c.branch,
                                                                    phone: c.phone,
                                                                    email: '',
                                                                    isMultiple: false,
                                                                    emailIndex: 0
                                                                });
                                                            }
                                                        });

                                                        return expandedContacts.map((contact, idx) => (
                                                            <div key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg flex flex-col gap-1.5 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors group/contact">
                                                                <div className="flex justify-between items-center">
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await navigator.clipboard.writeText(contact.name);
                                                                                toast.success(`已複製姓名: ${contact.name}`);
                                                                            } catch (err) {
                                                                                console.error('複製失敗', err);
                                                                            }
                                                                        }}
                                                                        className="group/name flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-900/50 px-2 py-1 rounded-lg transition-all"
                                                                        title="點擊複製姓名"
                                                                    >
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                                            {contact.name}
                                                                            {contact.isMultiple && <span className="text-[9px] text-blue-500 ml-1">#{contact.emailIndex}</span>}
                                                                        </span>
                                                                        {contact.branch && <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-900 px-1.5 rounded">{contact.branch}</span>}
                                                                        <Copy size={10} className="text-slate-300 group-hover/name:text-blue-500 opacity-0 group-hover/name:opacity-100 transition-all shrink-0" />
                                                                    </button>
                                                                </div>

                                                                <div className="flex flex-col gap-1 pl-1">
                                                                    {contact.phone && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await navigator.clipboard.writeText(contact.phone);
                                                                                    toast.success(`已複製電話: ${contact.phone}`);
                                                                                } catch (err) {
                                                                                    console.error('複製失敗', err);
                                                                                }
                                                                            }}
                                                                            className="group/phone text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                                                            title="點擊複製電話"
                                                                        >
                                                                            <Phone size={12} className="text-slate-400 shrink-0" />
                                                                            <span className="flex-1 text-left">{contact.phone}</span>
                                                                            <Copy size={10} className="text-slate-300 group-hover/phone:text-blue-500 opacity-0 group-hover/phone:opacity-100 transition-all shrink-0" />
                                                                        </button>
                                                                    )}
                                                                    {contact.email && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await navigator.clipboard.writeText(contact.email);
                                                                                    toast.success(`已複製: ${contact.email}`);
                                                                                } catch (err) {
                                                                                    console.error('複製失敗', err);
                                                                                }
                                                                            }}
                                                                            className="group/email text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2 select-all bg-slate-100/50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                                                            title="點擊複製"
                                                                        >
                                                                            <Mail size={12} className="text-slate-400 shrink-0" />
                                                                            <span className="flex-1 text-left truncate">{contact.email}</span>
                                                                            <Copy size={10} className="text-slate-300 group-hover/email:text-blue-500 opacity-0 group-hover/email:opacity-100 transition-all shrink-0" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
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
