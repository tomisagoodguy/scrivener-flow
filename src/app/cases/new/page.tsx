'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewCasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Transform empty strings to null for optional date fields
        const formatDate = (val: FormDataEntryValue) => val ? val.toString() : null;

        try {
            const { error } = await supabase
                .from('cases')
                .insert([
                    {
                        case_number: data.case_number,
                        city_area: data.city_area,
                        buyer: data.buyer,
                        seller: data.seller,
                        buyer_loan_bank: data.buyer_loan_bank,
                        seller_loan_bank: data.seller_loan_bank,
                        tax_type: data.tax_type,
                        contract_date: formatDate(data.contract_date),
                        seal_date: formatDate(data.seal_date),
                        tax_payment_date: formatDate(data.tax_payment_date),
                        transfer_date: formatDate(data.transfer_date),
                        handover_date: formatDate(data.handover_date),
                        status: data.status,
                        notes: data.notes,
                        is_back_rent: data.is_back_rent === 'on',
                        // timestamps are handled by default in DB if configured, but let's be safe
                    }
                ]);

            if (error) throw error;

            // Success
            router.push('/');
            router.refresh(); // Refresh server components on home page
        } catch (error: any) {
            console.error('Error creating case:', error);
            alert('建立失敗: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-200">
                        新增案件
                    </h1>
                    <p className="text-slate-400 mt-2">Create New Case</p>
                </div>
                <Link href="/" className="glass px-6 py-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 text-sm">
                    ← 返回列表
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="glass-card p-8 rounded-2xl animate-slide-up space-y-8">

                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-l-4 border-primary pl-3">基本資料</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">案件編號 (Case ID)</label>
                            <input name="case_number" type="text" placeholder="例如：AA123456" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">縣市區域</label>
                            <input name="city_area" type="text" placeholder="例如：台北(士林)" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">買方姓名</label>
                            <input name="buyer" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">賣方姓名</label>
                            <input name="seller" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">買方貸款銀行</label>
                            <input name="buyer_loan_bank" type="text" placeholder="例如：台新銀行" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">賣方貸款銀行</label>
                            <input name="seller_loan_bank" type="text" placeholder="例如：富邦銀行" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">增值稅類型</label>
                            <select name="tax_type" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer">
                                <option value="一般" className="bg-slate-800">一般稅率</option>
                                <option value="自用" className="bg-slate-800">自用稅率</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5"></div>

                {/* Section 2: Dates */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-amber-400 border-l-4 border-amber-400 pl-3">重要日期</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">簽約日</label>
                            <input name="contract_date" type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors [color-scheme:dark]" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">用印日</label>
                            <input name="seal_date" type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors [color-scheme:dark]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">完稅日</label>
                            <input name="tax_payment_date" type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors [color-scheme:dark]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">過戶日 (Transfer)</label>
                            <input name="transfer_date" type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors [color-scheme:dark]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">交屋日 (Handover)</label>
                            <input name="handover_date" type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors [color-scheme:dark]" />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5"></div>

                {/* Section 3: Status & Notes */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-accent border-l-4 border-accent pl-3">狀態與備註</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">目前狀態</label>
                            <select name="status" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer">
                                <option value="辦理中" className="bg-slate-800">辦理中</option>
                                <option value="結案" className="bg-slate-800">結案</option>
                                <option value="解約" className="bg-slate-800">解約</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">待辦事項 / 備註</label>
                            <input name="notes" type="text" placeholder="例如：需做輻射檢測" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-primary transition-colors" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                        <input name="is_back_rent" type="checkbox" id="rent_back" className="w-5 h-5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0" />
                        <label htmlFor="rent_back" className="text-slate-300 cursor-pointer select-none">是否有回租情況？</label>
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-4">
                    <Link href="/" className="px-6 py-3 rounded-xl text-slate-400 hover:bg-white/5 transition-colors">
                        取消
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary-deep text-white px-8 py-3 rounded-xl font-medium transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? '儲存中...' : '建立案件'}
                    </button>
                </div>

            </form>
        </div>
    );
}
