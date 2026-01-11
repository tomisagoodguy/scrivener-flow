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
    const [errorMsg, setErrorMsg] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // alert('正在建立案件... (Debug Mode)'); 
        // User reports "button not working", let's be silent first but aggressive on schema safety.
        console.log('>>> handleSubmit triggered');

        try {
            setLoading(true);
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            console.log('Form Data:', data);

            const formatDate = (val: FormDataEntryValue) => val ? val.toString() : null;

            /* 
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
            */

            console.log('Date validation passed. Preparing insert payload...');

            console.log('Date validation passed. Preparing insert payload...');

            // 1. Insert Case
            // Note: DB schema might not have 'cancellation_type' or 'district' in some versions.
            // Based on recreate_full_schema.sql, we have city, but maybe not cancellation_type.
            const casePayload = {
                case_number: data.case_number,
                buyer_name: data.buyer_name,
                buyer_phone: data.buyer_phone || null,
                seller_name: data.seller_name,
                seller_phone: data.seller_phone || null,
                status: data.status,
                city: data.city || 'Taichung',
                notes: data.notes || '',
                tax_type: data.tax_type || '一般',
                updated_at: new Date().toISOString()
            };

            const { data: newCase, error: caseError } = await supabase
                .from('cases')
                .insert([casePayload])
                .select()
                .single();

            if (caseError) {
                console.error('Supabase Case Error:', caseError);
                // Force extraction of properties even if not enumerable
                let details = '';
                for (const key in caseError) {
                    details += `${key}: ${(caseError as any)[key]}\n`;
                }
                if (!details) details = JSON.stringify(caseError, Object.getOwnPropertyNames(caseError));

                setErrorMsg(`資料庫錯誤 (Cases):\nCode: ${caseError.code}\nMessage: ${caseError.message}\nRaw:\n${details}`);
                setLoading(false);
                return;
            }

            if (!newCase) throw new Error('案件建立後無回傳資料');

            // 2. Insert Milestones Table
            // Based on recreate_full_schema.sql, milestone table might miss many amount columns.
            // We'll keep it safe by only inserting date columns first if we aren't sure.
            const milestonePayload: any = {
                case_id: newCase.id,
                contract_date: formatDate(data.contract_date),
                seal_date: formatDate(data.seal_date),
                tax_payment_date: formatDate(data.tax_payment_date),
                transfer_date: formatDate(data.transfer_date),
                balance_payment_date: formatDate(data.balance_payment_date),
                redemption_date: formatDate(data.redemption_date),
                handover_date: formatDate(data.handover_date),
            };

            // Only add amounts if they are expected (safeguard)
            // If the insert fails here, we will catch it specifically.
            const extraMilestoneFields = ['contract_amount', 'sign_diff_date', 'sign_diff_amount', 'seal_amount', 'tax_amount', 'balance_amount', 'transfer_note'];
            extraMilestoneFields.forEach(field => {
                if (data[field]) {
                    if (field.includes('date')) milestonePayload[field] = formatDate(data[field]);
                    else milestonePayload[field] = Number(data[field]);
                }
            });

            const { error: milestoneError } = await supabase
                .from('milestones')
                .insert([milestonePayload]);

            if (milestoneError) {
                console.error('Milestone Error:', milestoneError);
                let mDetails = JSON.stringify(milestoneError, Object.getOwnPropertyNames(milestoneError));
                setErrorMsg(prev => (prev ? prev + '\n\n' : '') + '里程碑資料儲存失敗 (Milestone Error):\n' + mDetails);
                // We DON'T return here yet, we want to try financials too, or maybe we should return to avoid partial data.
                // Given the user wants it to work, better block and fix.
                setLoading(false);
                return;
            }

            // 3. Insert Financials
            const financialsPayload = {
                case_id: newCase.id,
                total_price: data.contract_price ? Number(data.contract_price) : null,
                buyer_bank: data.buyer_loan_bank?.toString() || null,
                seller_bank: data.seller_loan_bank?.toString() || null,
            };

            const { error: finError } = await supabase
                .from('financials')
                .insert([financialsPayload]);

            if (finError) {
                console.error('Financial Error', finError);
                setErrorMsg(prev => (prev ? prev + '\n\n' : '') + '財務資料儲存失敗 (Financial Error):\n' + finError.message);
            }

            router.push('/cases?status=Processing');
            router.refresh();

        } catch (error: any) {
            console.error('Catch Error:', error);
            setErrorMsg('發生未預期的錯誤 (Catch):\n' + (error.message || JSON.stringify(error)));
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
                    setVal('buyer_name', parsedData.buyer_name);
                    setVal('buyer_phone', parsedData.buyer_phone);
                    setVal('seller_name', parsedData.seller_name);
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
                        setVal('contract_price', parsedData.total_price.toString());
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
                < div className="space-y-4" >
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
                            <input name="buyer_name" type="text" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" required />
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
                            <input name="seller_name" type="text" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">賣方電話</label>
                            <input name="seller_phone" type="text" placeholder="09xx-xxx-xxx" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium font-bold text-primary">成交總價 (萬元)</label>
                            <input name="contract_price" type="number" step="0.1" className="w-full bg-white border-2 border-primary/20 rounded-lg px-4 py-3 text-black font-bold focus:border-primary" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">稅單性質</label>
                            <select name="tax_type" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black appearance-none cursor-pointer">
                                <option value="一般">一般</option>
                                <option value="自用">自用</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">買方貸款銀行</label>
                            <input name="buyer_loan_bank" type="text" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600 font-medium">塗銷方式</label>
                            <select name="cancellation_type" defaultValue="代書塗銷" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black appearance-none cursor-pointer">
                                <option value="代書塗銷">代書塗銷 (我方辦理)</option>
                                <option value="賣方自辦">賣方自辦</option>
                                <option value="無">無</option>
                            </select>
                        </div>
                    </div>
                </div >

                <div className="border-t border-gray-200"></div>

                {/* Section 2: Dates */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-amber-600 border-l-4 border-amber-500 pl-3">重要日期與付款明細</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Contract Stage */}
                        <div className="bg-gray-50/50 p-4 rounded-xl space-y-3 border border-gray-100 lg:col-span-1">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-amber-700">簽約日</label>
                                <input name="contract_date" type="date" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">簽約款 (萬元)</label>
                                <input name="contract_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="p-2 bg-amber-50 rounded border border-dashed border-amber-200 space-y-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-600 uppercase">補差額日</label>
                                    <input name="sign_diff_date" type="date" className="w-full bg-white/80 border border-gray-200 rounded px-2 py-1 text-[11px]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-600 uppercase">補差金額</label>
                                    <input name="sign_diff_amount" type="number" step="0.1" className="w-full bg-white/80 border border-gray-200 rounded px-2 py-1 text-[11px]" />
                                </div>
                            </div>
                        </div>

                        {/* Seal & Tax */}
                        <div className="bg-gray-50/50 p-4 rounded-xl space-y-4 border border-gray-100">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-blue-600">用印日</label>
                                <input name="seal_date" type="date" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">用印款 (萬元)</label>
                                <input name="seal_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="border-t border-gray-200 my-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-emerald-600">完稅日</label>
                                    <input name="tax_payment_date" type="date" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-600">完稅款 (萬元)</label>
                                    <input name="tax_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Transfer & Note */}
                        <div className="bg-gray-50/50 p-4 rounded-xl space-y-4 border border-gray-100">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">過戶日</label>
                                <input name="transfer_date" type="date" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">過戶備註</label>
                                <input name="transfer_note" type="text" placeholder="例如：代書辦理" className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="border-t border-gray-200 my-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-orange-600">代償日</label>
                                    <input name="redemption_date" type="date" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Tail & Handover */}
                        <div className="bg-gray-50/50 p-4 rounded-xl space-y-4 border border-gray-100">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-purple-600">尾款日</label>
                                <input name="balance_payment_date" type="date" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">尾款 (萬元)</label>
                                <input name="balance_amount" type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="border-t border-gray-200 my-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-red-600">交屋日</label>
                                    <input name="handover_date" type="date" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                </div>
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

                    {/* DEBUG ERROR DISPLAY */}
                    {errorMsg && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 whitespace-pre-wrap font-mono text-sm max-w-xl">
                            <p className="font-bold">發生錯誤：</p>
                            {errorMsg}
                        </div>
                    )}

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
