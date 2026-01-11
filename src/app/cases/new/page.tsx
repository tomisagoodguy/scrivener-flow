'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { parseDocx } from '@/app/actions/parseDocx';
import QuickNotes from '@/components/QuickNotes';

export default function NewCasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        const formatDate = (val: FormDataEntryValue) => val ? val.toString() : null;

        // Date Validation: Ensure strictly increasing order (or equal)
        const dateFields = [
            { key: 'contract_date', label: '簽約日' },
            { key: 'seal_date', label: '用印日' },
            { key: 'tax_payment_date', label: '完稅日' },
            { key: 'transfer_date', label: '過戶日' },
            { key: 'handover_date', label: '交屋日' },
        ];

        for (let i = 0; i < dateFields.length; i++) {
            const currentVal = data[dateFields[i].key]?.toString();
            if (!currentVal) continue;

            for (let j = 0; j < i; j++) {
                const prevVal = data[dateFields[j].key]?.toString();
                // Compare strings "YYYY-MM-DD" directly
                if (prevVal && currentVal < prevVal) {
                    alert(`流程日期錯誤：${dateFields[i].label} (${currentVal}) 不可早於 ${dateFields[j].label} (${prevVal})`);
                    setLoading(false);
                    return;
                }
            }
        }

        try {
            // 1. Insert Case
            const { data: newCase, error: caseError } = await supabase
                .from('cases')
                .insert([
                    {
                        case_number: data.case_number,
                        city: data.city,
                        buyer_name: data.buyer,
                        buyer_phone: data.buyer_phone || null,
                        seller_name: data.seller,
                        seller_phone: data.seller_phone || null,
                        status: data.status,
                        notes: data.notes,
                        is_back_rent: data.is_back_rent === 'on',
                        // buyer_loan_bank: data.buyer_loan_bank || null, // Moved to financials
                        // seller_loan_bank: data.seller_loan_bank || null, // Moved to financials
                        // tax_type: data.tax_type, // Moved to financials check? Wait, interface says Cases has tax_type? Let's check schema.
                        // Assuming tax_type is in financials based on previous error context or schema design?
                        // Actually, looking at types/index.ts: tax_type is in Case interface (line 11), but also VatType in Financials (line 120).
                        // Let's keep tax_type in cases if it exists there, but remove banks which definitely caused error.
                        // If tax_type also fails, we'll move it. But error specifically said "buyer_loan_bank".
                        tax_type: data.tax_type,
                        cancellation_type: data.cancellation_type,
                        updated_at: new Date().toISOString(),
                        todos: {
                            '買方蓋印章': false, '賣方蓋印章': false, '用印款': false, '完稅款': false,
                            '權狀印鑑': false, '授權': false, '解約排除': false, '規費': false,
                            '設定': false, '稅單': false, '差額': false, '整過戶': false,
                            '整交屋': false, '實登': false, '打單': false, '履保': false,
                            '水電': false, '稅費分算': false, '保單': false
                        }
                    }
                ])
                .select()
                .single();

            if (caseError) throw new Error('建立案件失敗: ' + caseError.message);
            if (!newCase) throw new Error('案件建立後無回傳資料');

            // 2. Insert Milestones
            const { error: milestoneError } = await supabase
                .from('milestones')
                .insert([
                    {
                        case_id: newCase.id,
                        contract_date: formatDate(data.contract_date),
                        seal_date: formatDate(data.seal_date),
                        tax_payment_date: formatDate(data.tax_payment_date),
                        transfer_date: formatDate(data.transfer_date),
                        balance_payment_date: formatDate(data.balance_payment_date),
                        handover_date: formatDate(data.handover_date),
                        redemption_date: formatDate(data.redemption_date),
                        // Payment Details
                        contract_method: data.contract_method?.toString() || null,
                        contract_amount: data.contract_amount ? Number(data.contract_amount) : null,
                        sign_diff_amount: data.sign_diff_amount ? Number(data.sign_diff_amount) : null,
                        sign_diff_date: formatDate(data.sign_diff_date),
                        seal_method: data.seal_method?.toString() || null,
                        seal_amount: data.seal_amount ? Number(data.seal_amount) : null,
                        tax_method: data.tax_method?.toString() || null,
                        tax_amount: data.tax_amount ? Number(data.tax_amount) : null,
                        balance_method: data.balance_method?.toString() || null,
                        balance_amount: data.balance_amount ? Number(data.balance_amount) : null,
                        created_at: new Date().toISOString()
                    }
                ]);

            // 3. Insert Financials (Total Price & Banks)
            // Even if total_price is empty, we might have banks.
            const hasFinancials = data.total_price || data.buyer_loan_bank || data.seller_loan_bank;

            if (hasFinancials) {
                const { error: finError } = await supabase
                    .from('financials')
                    .insert([
                        {
                            case_id: newCase.id,
                            total_price: data.total_price ? Number(data.total_price) : null,
                            buyer_bank: data.buyer_loan_bank || null, // 'buyer_bank' in Financials interface
                            seller_bank: data.seller_loan_bank || null, // 'seller_bank' in Financials interface
                            created_at: new Date().toISOString()
                        }
                    ]);

                if (finError) {
                    console.error('Error creating financials:', finError);
                    // Don't block, just log/alert
                    // alert('案件建立成功，但財務資訊(總價)儲存失敗: ' + finError.message);
                }
            }

            if (milestoneError) {
                console.error('Error creating milestones:', milestoneError);
                alert('案件已建立，但日期資料儲存失敗: ' + milestoneError.message);
            }

            router.push('/cases?status=Processing');
            router.refresh();
        } catch (error: any) {
            console.error('Error creating case:', error);
            const msg = error.message || '';
            if (msg.includes('duplicate key') || msg.includes('cases_case_number_key')) {
                alert('錯誤：案件編號已經存在！\n請確認是否重複建立，或修改編號後再試一次。');
            } else {
                alert('建立失敗: ' + msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const parsedData = await parseDocx(formData);
            console.log('Parsed Data:', parsedData);

            const rawDebug = (parsedData as any).debug_text || '';

            if (!parsedData.case_number && !parsedData.buyer_name) {
                alert('⚠️ 無法識別資料！請確認檔案內容格式。\n\n讀取到的文字預覽:\n' + rawDebug);
            } else {
                const form = document.querySelector('form') as HTMLFormElement;
                if (form) {
                    const setVal = (name: string, val?: string) => {
                        const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                        if (el && val) {
                            el.value = val;
                            if (name === 'notes') setNotes(val);
                        }
                    };

                    setVal('case_number', parsedData.case_number);
                    setVal('buyer', parsedData.buyer_name);
                    setVal('buyer_phone', parsedData.buyer_phone);
                    setVal('seller', parsedData.seller_name);
                    setVal('seller_phone', parsedData.seller_phone);

                    setVal('contract_date', parsedData.contract_date);
                    setVal('contract_amount', parsedData.contract_amount?.toString());
                    setVal('contract_method', parsedData.contract_method);

                    setVal('sign_diff_date', parsedData.sign_diff_date);
                    setVal('sign_diff_amount', parsedData.sign_diff_amount?.toString());

                    setVal('seal_date', parsedData.seal_date);
                    setVal('seal_amount', parsedData.seal_amount?.toString());
                    setVal('seal_method', parsedData.seal_method);

                    setVal('tax_payment_date', parsedData.tax_payment_date);
                    setVal('tax_amount', parsedData.tax_amount?.toString());
                    setVal('tax_method', parsedData.tax_method);

                    setVal('balance_payment_date', parsedData.balance_payment_date);
                    setVal('balance_amount', parsedData.balance_amount?.toString());
                    setVal('balance_method', parsedData.balance_method);

                    setVal('handover_date', parsedData.handover_date);

                    if (parsedData.total_price) {
                        setVal('total_price', parsedData.total_price.toString());
                    }
                }
                alert('✅ 自動填寫完成！\n物件編號: ' + (parsedData.case_number || '未找到'));
            }
        } catch (err: any) {
            console.error(err);
            alert('解析失敗: ' + err.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                        新增案件
                    </h1>
                    <p className="text-gray-600 mt-2">Create New Case</p>
                </div>
                <div className="flex gap-4">
                    <label className="bg-primary hover:bg-primary-deep text-white px-4 py-2 rounded-full cursor-pointer transition-colors text-sm flex items-center gap-2 shadow-sm">
                        <span>📄 上傳案件單 (.docx)</span>
                        <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} disabled={loading} />
                    </label>
                    <Link href="/" className="bg-white border border-gray-300 px-6 py-2 rounded-full hover:bg-gray-50 transition-colors text-gray-700 text-sm flex items-center shadow-sm">
                        ← 返回列表
                    </Link>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="glass-card p-8 animate-slide-up space-y-8">

                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-l-4 border-primary pl-3">基本資料</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">案件編號 (Case ID)</label>
                            <input name="case_number" type="text" placeholder="例如：AA123456" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm focus:bg-white" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">承辦地點 (簽約中心)</label>
                            <select name="city" defaultValue="士林" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm focus:bg-white appearance-none cursor-pointer">
                                <option value="士林">士林</option>
                                <option value="內湖">內湖</option>
                            </select>
                        </div>
                    </div>

                    {/* Buyer Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">買方姓名</label>
                            <input name="buyer" type="text" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">買方電話</label>
                            <input name="buyer_phone" type="text" placeholder="09xx-xxx-xxx" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                        </div>
                    </div>

                    {/* Seller Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">賣方姓名</label>
                            <input name="seller" type="text" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">賣方電話</label>
                            <input name="seller_phone" type="text" placeholder="09xx-xxx-xxx" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <label className="text-sm text-gray-600 font-medium">成交總價 (萬元)</label>
                            <input name="total_price" type="number" placeholder="例如：488" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <label className="text-sm text-gray-600 font-medium">增值稅類型</label>
                            <select name="tax_type" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors appearance-none cursor-pointer">
                                <option value="一般">一般稅率</option>
                                <option value="自用">自用稅率</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">買方貸款銀行</label>
                            <input name="buyer_loan_bank" type="text" placeholder="例如：台新銀行" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-orange-600 font-bold">賣方代償銀行</label>
                            <input name="seller_loan_bank" type="text" placeholder="例如：富邦銀行" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">代償日期</label>
                            <input name="redemption_date" type="date" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">塗銷方式</label>
                            <select name="cancellation_type" defaultValue="代書塗銷" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors appearance-none cursor-pointer">
                                <option value="代書塗銷">代書塗銷 (我方辦理)</option>
                                <option value="賣方自辦">賣方自辦</option>
                                <option value="無">無 (無借錢免塗銷)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Section 2: Dates */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-amber-600 border-l-4 border-amber-500 pl-3">重要日期與付款明細</h3>

                    <div className="grid grid-cols-1 gap-8">
                        {/* Contract Stage */}
                        <div className="bg-gray-50/50 p-4 rounded-xl space-y-4 border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-amber-700">簽約日</label>
                                    <input name="contract_date" type="date" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:ring-1 focus:ring-amber-500" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-600">簽約款 (萬元)</label>
                                    <input name="contract_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black" />
                                </div>
                            </div>
                            {/* Signing Difference */}
                            <div className="p-3 bg-amber-500/5 rounded-lg border border-dashed border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-amber-600">簽約補差額日期</label>
                                    <input name="sign_diff_date" type="date" className="w-full bg-white/50 border border-gray-200 rounded px-2 py-1 text-sm text-black" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-amber-600">補差額金額 (萬元)</label>
                                    <input name="sign_diff_amount" type="number" step="0.1" className="w-full bg-white/50 border border-gray-200 rounded px-2 py-1 text-sm text-black" />
                                </div>
                            </div>
                        </div>

                        {/* Seal & Tax */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50/50 p-4 rounded-xl space-y-4 border border-gray-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-blue-600">用印日</label>
                                    <input name="seal_date" type="date" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-600">用印款 (萬元)</label>
                                    <input name="seal_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-1 text-sm text-black" />
                                </div>

                            </div>

                            <div className="bg-gray-50/50 p-4 rounded-xl space-y-4 border border-gray-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-emerald-600">完稅日</label>
                                    <input name="tax_payment_date" type="date" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:ring-1 focus:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-600">完稅款 (萬元)</label>
                                    <input name="tax_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-1 text-sm text-black" />
                                </div>

                            </div>
                        </div>

                        {/* Transfer & Balance & Handover */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">過戶日</label>
                                <input name="transfer_date" type="date" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black" />
                            </div>

                            <div className="bg-gray-50/50 p-4 rounded-xl space-y-4 border border-gray-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-purple-600">尾款日</label>
                                    <input name="balance_payment_date" type="date" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:ring-1 focus:ring-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-600">尾款 (萬元)</label>
                                    <input name="balance_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-1 text-sm text-black" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-red-600">交屋日</label>
                                <input name="handover_date" type="date" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Section 3: Status & Notes */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-accent border-l-4 border-accent pl-3">狀態與備註</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">目前狀態</label>
                            <select name="status" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm focus:bg-white appearance-none cursor-pointer">
                                <option value="Processing">辦理中</option>
                                <option value="Closed">結案</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-600 font-medium">待辦事項 / 備註</label>
                        <textarea
                            name="notes"
                            rows={3}
                            placeholder="例如：需做輻射檢測"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm focus:bg-white"
                        />
                        <QuickNotes onSelect={(note) => setNotes(prev => prev ? `${prev}\n${note}` : note)} />
                    </div>


                </div >

                <div className="pt-6 flex justify-end gap-4">
                    <Link href="/" className="px-6 py-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
                        取消
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary-deep text-white px-8 py-3 rounded-xl font-medium transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                    >
                        {loading ? '儲存中...' : '建立案件'}
                    </button>
                </div>

            </form >
        </div >
    );
}
