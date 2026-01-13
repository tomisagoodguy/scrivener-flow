'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

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
    const [isEditing, setIsEditing] = useState(false);
    const [currentBank, setCurrentBank] = useState<Partial<BankContact>>({});

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
            setBanks(data || []);
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

            const payload = {
                ...currentBank,
                last_updated_by: user.id,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('bank_contacts')
                .upsert(payload as any)
                .select();

            if (error) throw error;

            setIsEditing(false);
            setCurrentBank({});
            fetchBanks();
        } catch (error: any) {
            console.error('Error saving bank:', error.message || JSON.stringify(error, null, 2));
            alert('儲存失敗：' + (error.message || '未知錯誤'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這筆銀行資訊嗎？')) return;
        try {
            const { error } = await supabase.from('bank_contacts').delete().eq('id', id);
            if (error) throw error;
            fetchBanks();
        } catch (error) {
            console.error('Error deleting bank:', error);
            alert('刪除失敗');
        }
    };

    const filteredBanks = banks.filter(b =>
        (b.bank_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (b.branch_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (b.contact_person?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto font-sans bg-background">
            <Header />

            <main className="mt-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                            ← 返回首頁
                        </Link>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            🏦 銀行資訊庫
                        </h1>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="搜尋銀行、分行、人員..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            onClick={() => { setCurrentBank({}); setIsEditing(true); }}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap"
                        >
                            + 新增銀行
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-900 font-bold text-lg">資料載入中...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-gray-100 border-b-2 border-gray-300">
                                    <tr>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 whitespace-nowrap min-w-[180px] border-r border-gray-300">銀行 / 分行</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 min-w-[220px] border-r border-gray-300">聯絡窗口</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 min-w-[300px] border-r border-gray-300">貸款條件 / 方案</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 min-w-[200px] border-r border-gray-300">備註</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 w-20 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {filteredBanks.map(bank => (
                                        <tr key={bank.id} className="hover:bg-emerald-50/50 transition-colors group">
                                            <td className="px-4 py-4 align-top border-r border-gray-300">
                                                <div className="font-bold text-lg text-gray-900 mb-1">{bank.bank_name}</div>
                                                {bank.branch_name && (
                                                    <div className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded inline-block text-xs border border-emerald-200">
                                                        {bank.branch_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 align-top border-r border-gray-300 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 font-bold w-4">👤</span>
                                                    <span className="font-bold text-gray-900 text-base">{bank.contact_person || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 font-bold w-4">📞</span>
                                                    {bank.phone ? (
                                                        <a href={`tel:${bank.phone}`} className="text-gray-900 hover:text-emerald-700 hover:underline font-medium decoration-emerald-500 decoration-2 underline-offset-2">
                                                            {bank.phone}
                                                        </a>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 font-bold w-4">✉️</span>
                                                    {bank.email ? (
                                                        <a href={`mailto:${bank.email}`} className="text-gray-800 hover:text-emerald-700 hover:underline break-all">
                                                            {bank.email}
                                                        </a>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 align-top border-r border-gray-300">
                                                <pre className="whitespace-pre-wrap font-medium text-gray-900 font-sans leading-relaxed text-sm">
                                                    {bank.loan_conditions || <span className="text-gray-400 italic font-normal">尚無方案資料</span>}
                                                </pre>
                                            </td>
                                            <td className="px-4 py-4 align-top border-r border-gray-300">
                                                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                    {bank.notes || <span className="text-gray-400 italic">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 align-top text-center">
                                                <div className="flex flex-col gap-2 items-center justify-start opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setCurrentBank(bank); setIsEditing(true); }}
                                                        className="p-1.5 text-blue-800 hover:bg-blue-100 rounded bg-white border border-blue-300"
                                                        title="編輯"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(bank.id)}
                                                        className="p-1.5 text-red-800 hover:bg-red-100 rounded bg-white border border-red-300"
                                                        title="刪除"
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredBanks.length === 0 && (
                            <div className="p-12 text-center text-gray-500 bg-gray-50">
                                查無相符銀行資料，請嘗試其他關鍵字
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {currentBank.id ? '編輯銀行資訊' : '新增銀行資訊'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">×</button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">銀行名稱 *</label>
                                    <input
                                        required
                                        value={currentBank.bank_name || ''}
                                        onChange={e => setCurrentBank({ ...currentBank, bank_name: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="例如：中國信託"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">分行名稱</label>
                                    <input
                                        value={currentBank.branch_name || ''}
                                        onChange={e => setCurrentBank({ ...currentBank, branch_name: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="例如：營業部"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">聯絡窗口 (行員)</label>
                                    <input
                                        value={currentBank.contact_person || ''}
                                        onChange={e => setCurrentBank({ ...currentBank, contact_person: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">電話</label>
                                    <input
                                        value={currentBank.phone || ''}
                                        onChange={e => setCurrentBank({ ...currentBank, phone: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Email</label>
                                <input
                                    type="email"
                                    value={currentBank.email || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, email: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">貸款條件 / 方案細節</label>
                                <textarea
                                    value={currentBank.loan_conditions || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, loan_conditions: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none min-h-[120px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="利率、成數、綁約期間、特殊限制..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">其他備註</label>
                                <textarea
                                    value={currentBank.notes || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, notes: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none min-h-[80px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                                >
                                    儲存更新
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
