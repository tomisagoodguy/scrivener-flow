'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';

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
    const [isEditing, setIsEditing] = useState(false);
    const [currentData, setCurrentData] = useState<Partial<RedemptionInfo>>({});
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('請先登入');
                return;
            }

            const payload = {
                ...currentData,
                last_updated_by: user.id,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('bank_redemptions')
                .upsert(payload as any)
                .select();

            if (error) throw error;

            setIsEditing(false);
            setCurrentData({});
            fetchRedemptions();
        } catch (error: any) {
            alert('儲存失敗：' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這筆代償資訊嗎？')) return;
        try {
            const { error } = await supabase.from('bank_redemptions').delete().eq('id', id);
            if (error) throw error;
            fetchRedemptions();
        } catch (error: any) {
            alert('刪除失敗：' + error.message);
        }
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // Could add toast here
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const filteredData = redemptions.filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            (item.bank_name || '').toLowerCase().includes(term) ||
            (item.account_info || '').toLowerCase().includes(term) ||
            (item.service_phone || '').toLowerCase().includes(term)
        );
    });

    const suggestions = redemptions
        .filter(c => c.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm.length > 0)
        .slice(0, 5);

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto font-sans bg-background">
            <Header />

            <main className="mt-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                            ← 返回首頁
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
                                💰 代償塗銷資訊庫
                            </h1>
                            <span className="text-xs text-amber-600/80 font-medium px-1">
                                全團隊共用資料庫・即時同步
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto flex-wrap items-start">
                        <div className="relative flex-1 md:w-80 group z-20">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="🔍 搜尋銀行、專戶..."
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 shadow-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {/* Autocomplete */}
                            {showSuggestions && searchTerm.length > 0 && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform origin-top animate-in fade-in slide-in-from-top-2">
                                    <div className="text-xs font-bold text-gray-400 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                        快速選擇
                                    </div>
                                    {suggestions.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setSearchTerm(s.bank_name);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-between group/item"
                                        >
                                            <span className="font-bold text-gray-700 dark:text-gray-200 group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400">
                                                {s.bank_name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => { setCurrentData({}); setIsEditing(true); }}
                            className="bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95 whitespace-nowrap h-[46px]"
                        >
                            + 新增
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
                                        <th className="px-4 py-3 font-extrabold text-gray-900 whitespace-nowrap min-w-[200px] border-r border-gray-300">銀行 / 客服</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 min-w-[300px] border-r border-gray-300">專戶資訊 (點擊複製)</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 min-w-[250px] border-r border-gray-300">領清償 / 備註</th>
                                        <th className="px-4 py-3 font-extrabold text-gray-900 w-20 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {filteredData.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-amber-50/50 transition-colors group">
                                            <td className="px-4 py-4 align-top border-r border-gray-300">
                                                <div className="font-bold text-lg text-gray-900 mb-1">{item.bank_name}</div>
                                                {item.service_phone ? (
                                                    <div className="flex items-center gap-1.5 text-gray-800 font-medium bg-gray-100 px-2 py-1 rounded w-fit">
                                                        <span>📞</span>
                                                        <span>{item.service_phone}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-400 text-xs italic">無客服電話</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 align-top border-r border-gray-300">
                                                <div
                                                    className="relative group/copy cursor-pointer p-2 -m-2 rounded hover:bg-gray-50"
                                                    onClick={() => handleCopy(item.account_info)}
                                                    title="點擊複製"
                                                >
                                                    <pre className="whitespace-pre-wrap font-medium text-gray-900 font-sans leading-relaxed">
                                                        {item.account_info || <span className="text-gray-400 italic">尚無專戶資料</span>}
                                                    </pre>
                                                    {item.account_info && (
                                                        <span className="absolute top-2 right-2 opacity-0 group-hover/copy:opacity-100 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded transition-opacity pointer-events-none">
                                                            複製
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 align-top space-y-3 border-r border-gray-300">
                                                {item.lead_time && (
                                                    <div>
                                                        <span className="text-xs font-bold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded mr-1 border border-amber-300">
                                                            時效
                                                        </span>
                                                        <span className="text-gray-900 font-medium">{item.lead_time}</span>
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div>
                                                        <span className="text-xs font-bold text-blue-900 bg-blue-200 px-1.5 py-0.5 rounded mr-1 border border-blue-300">
                                                            備註
                                                        </span>
                                                        <span className="text-gray-900 font-medium leading-relaxed">{item.notes}</span>
                                                    </div>
                                                )}
                                                {!item.lead_time && !item.notes && (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 align-top text-center">
                                                <div className="flex flex-col gap-2 items-center justify-start opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setCurrentData(item); setIsEditing(true); }}
                                                        className="p-1.5 text-blue-800 hover:bg-blue-100 rounded bg-white border border-blue-300"
                                                        title="編輯"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
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
                        {filteredData.length === 0 && (
                            <div className="p-12 text-center text-gray-500 bg-gray-50">
                                查無相符資料，請嘗試其他關鍵字
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {currentData.id ? '編輯代償資訊' : '新增代償資訊'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">×</button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">銀行名稱 *</label>
                                    <input
                                        required
                                        value={currentData.bank_name || ''}
                                        onChange={e => setCurrentData({ ...currentData, bank_name: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="例如：兆豐銀行"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">客服電話</label>
                                    <input
                                        value={currentData.service_phone || ''}
                                        onChange={e => setCurrentData({ ...currentData, service_phone: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">專戶資訊 / 匯款帳號</label>
                                <textarea
                                    value={currentData.account_info || ''}
                                    onChange={e => setCurrentData({ ...currentData, account_info: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none min-h-[120px] font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="請輸入分行、戶名、帳號等詳細資訊..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">領清償時間 / 規則</label>
                                <input
                                    value={currentData.lead_time || ''}
                                    onChange={e => setCurrentData({ ...currentData, lead_time: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="例如：3日(不含撥款日)"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">其他備註</label>
                                <textarea
                                    value={currentData.notes || ''}
                                    onChange={e => setCurrentData({ ...currentData, notes: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none min-h-[80px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                                    className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl shadow-lg hover:bg-amber-700 transition-all active:scale-95"
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
