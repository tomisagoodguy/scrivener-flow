'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';
import { parseDocx } from '@/app/actions/parseDocx';
import CaseTodos from '@/components/CaseTodos';
import QuickNotes from '@/components/QuickNotes';

interface EditCaseFormProps {
    initialData: DemoCase;
}

export default function EditCaseForm({ initialData }: EditCaseFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState(initialData.notes || '');

    // Helper to safely get milestones object whether it's an array or object
    const milestones = Array.isArray(initialData.milestones) ? initialData.milestones[0] : initialData.milestones || {};
    // Helper for financials
    const financials = Array.isArray(initialData.financials) ? initialData.financials[0] : initialData.financials || {};

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Transform empty strings to null for optional date fields
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
            // 1. Update Cases Table
            const { error: caseError } = await supabase
                .from('cases')
                .update({
                    case_number: data.case_number,
                    city: data.city, // Updated to match DB column 'city'
                    // district: data.district, // If we had district picker
                    buyer_name: data.buyer, // Map 'buyer' input to 'buyer_name' column
                    seller_name: data.seller, // Map 'seller' input to 'seller_name' column
                    // buyer_loan_bank: data.buyer_loan_bank, // ERROR: Moved to financials
                    // seller_loan_bank: data.seller_loan_bank, // ERROR: Moved to financials
                    // tax_type: data.tax_type, // Should check if this also errors. Keeping for now as error was specifically buyer_loan_bank.
                    status: data.status,
                    notes: data.notes,
                    pending_tasks: data.pending_tasks,
                    is_back_rent: data.is_back_rent === 'on',
                    cancellation_type: data.cancellation_type,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', initialData.id);

            if (caseError) throw caseError;

            // 2. Upsert Milestones Table
            // We need to upsert based on case_id.
            // If milestones exist, they have an ID. If not, we rely on case_id uniqueness or just insert?
            // Safer to select first, or just upsert on (case_id).
            // Schema usually has case_id as foreign key.
            const { error: milestoneError } = await supabase
                .from('milestones')
                .upsert({
                    case_id: initialData.id,
                    contract_date: formatDate(data.contract_date),
                    seal_date: formatDate(data.seal_date),
                    tax_payment_date: formatDate(data.tax_payment_date),
                    transfer_date: formatDate(data.transfer_date),
                    handover_date: formatDate(data.handover_date),
                    balance_payment_date: formatDate(data.balance_payment_date),
                    redemption_date: formatDate(data.redemption_date),
                    transfer_note: data.transfer_note?.toString() || null,
                    // Payment Details
                    contract_method: data.contract_method?.toString() || null,
                    contract_amount: data.contract_amount ? Number(data.contract_amount) : null,
                    sign_diff_amount: data.sign_diff_amount ? Number(data.sign_diff_amount) : null,
                    seal_method: data.seal_method?.toString() || null,
                    seal_amount: data.seal_amount ? Number(data.seal_amount) : null,
                    tax_method: data.tax_method?.toString() || null,
                    tax_amount: data.tax_amount ? Number(data.tax_amount) : null,
                    balance_method: data.balance_method?.toString() || null,
                    balance_amount: data.balance_amount ? Number(data.balance_amount) : null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'case_id' });

            if (milestoneError) throw milestoneError;

            // 3. Upsert Financials (Total Price)
            // Similar upsert logic
            const { error: finError } = await supabase
                .from('financials')
                .upsert({
                    case_id: initialData.id,
                    total_price: data.total_price ? Number(data.total_price) : null,
                    buyer_bank: data.buyer_loan_bank?.toString() || null,
                    seller_bank: data.seller_loan_bank?.toString() || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'case_id' });

            if (finError) throw finError;

            // Success
            // alert('更新成功！'); // Optional: remove alert if user wants instant redirect, but keeping it for feedback is usually good. User didn't say remove alert.
            // Actually user implies "按下去沒反應", so maybe alert is annoying or blocking?
            // "每次按儲存就要自動..." implies automation.
            // I will keep alert but make it short, or remove it? I'll keep it for confirmation unless asked.
            // But wait, "按下去沒反應" was about the status dropdown I think? "另外目前狀態 按下去沒反應"
            // Ah, he means the status dropdown likely didn't change anything or was broken.
            // I'll proceed with redirect.

            router.push('/cases?status=Processing');
            router.refresh();
        } catch (error: any) {
            console.error('Error updating case:', error);
            alert('更新失敗: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        // Prevent event bubbling just in case
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('確定要刪除此案件嗎？此動作無法復原。')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('cases')
                .delete()
                .eq('id', initialData.id);

            if (error) throw error;
            router.push('/cases');
            router.refresh();
        } catch (error: any) {
            console.error('Error deleting case:', error);
            alert('刪除失敗: ' + error.message);
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

            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
                const setVal = (name: string, val?: string) => {
                    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                    if (el && val) {
                        el.value = val;
                        if (name === 'notes') setNotes(val);
                    }
                };

                if (parsedData.case_number) setVal('case_number', parsedData.case_number);
                if (parsedData.buyer_name) setVal('buyer', parsedData.buyer_name);
                if (parsedData.seller_name) setVal('seller', parsedData.seller_name);

                if (parsedData.contract_date) setVal('contract_date', parsedData.contract_date);
                if (parsedData.contract_amount) setVal('contract_amount', parsedData.contract_amount.toString());
                if (parsedData.contract_method) setVal('contract_method', parsedData.contract_method);

                if (parsedData.sign_diff_date) setVal('sign_diff_date', parsedData.sign_diff_date);
                if (parsedData.sign_diff_amount) setVal('sign_diff_amount', parsedData.sign_diff_amount.toString());

                if (parsedData.seal_date) setVal('seal_date', parsedData.seal_date);
                if (parsedData.seal_amount) setVal('seal_amount', parsedData.seal_amount.toString());
                if (parsedData.seal_method) setVal('seal_method', parsedData.seal_method);

                if (parsedData.tax_payment_date) setVal('tax_payment_date', parsedData.tax_payment_date);
                if (parsedData.tax_amount) setVal('tax_amount', parsedData.tax_amount.toString());
                if (parsedData.tax_method) setVal('tax_method', parsedData.tax_method);

                if (parsedData.balance_payment_date) setVal('balance_payment_date', parsedData.balance_payment_date);
                if (parsedData.balance_amount) setVal('balance_amount', parsedData.balance_amount.toString());
                if (parsedData.balance_method) setVal('balance_method', parsedData.balance_method);

                if (parsedData.handover_date) setVal('handover_date', parsedData.handover_date);
                if (parsedData.total_price) setVal('total_price', parsedData.total_price.toString());

                alert('✅ 資料解析完成並已填入表單！');
            }
        } catch (err: any) {
            alert('解析失敗: ' + err.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-card glass-card p-8 rounded shadow-sm animate-slide-up space-y-8 border border-card-border">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-primary border-l-4 border-primary pl-3">基本資料</h3>
                    <label className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs flex items-center gap-2 border border-primary/20 font-bold">
                        <span>📄 重新讀取案件單 (.docx)</span>
                        <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} disabled={loading} />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">案件編號 (Case ID)</label>
                        <input name="case_number" defaultValue={initialData.case_number} type="text" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">承辦地點 (簽約中心)</label>
                        <select name="city" defaultValue={initialData.city || '士林'} className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors appearance-none cursor-pointer">
                            <option value="士林">士林</option>
                            <option value="內湖">內湖</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">買方姓名</label>
                        <input name="buyer" defaultValue={initialData.buyer_name} type="text" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">賣方姓名</label>
                        <input name="seller" defaultValue={initialData.seller_name} type="text" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">買方貸款銀行</label>
                        <input name="buyer_loan_bank" defaultValue={financials?.buyer_bank} type="text" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60 font-bold text-orange-600">賣方代償銀行</label>
                        <input name="seller_loan_bank" defaultValue={financials?.seller_bank} type="text" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-colors" placeholder="無借錢則不填" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">代償日期</label>
                        <input name="redemption_date" defaultValue={milestones?.redemption_date} type="date" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">塗銷方式</label>
                        <select name="cancellation_type" defaultValue={initialData.cancellation_type || '代書塗銷'} className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors appearance-none cursor-pointer">
                            <option value="代書塗銷">代書塗銷 (我方辦理)</option>
                            <option value="賣方自辦">賣方自辦</option>
                            <option value="無">無 (無借錢免塗銷)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">成交總價 (萬元)</label>
                        <input name="total_price" defaultValue={financials?.total_price} type="number" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">增值稅類型</label>
                        <select name="tax_type" defaultValue={initialData.tax_type} className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors appearance-none cursor-pointer">
                            <option value="一般" className="bg-card text-foreground">一般稅率</option>
                            <option value="自用" className="bg-card text-foreground">自用稅率</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="border-t border-border-color"></div>

            {/* Section 2: Dates */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-amber-600 border-l-4 border-amber-500 pl-3">重要日期與付款明細</h3>

                <div className="grid grid-cols-1 gap-8">
                    {/* Contract Stage */}
                    <div className="bg-secondary/20 p-4 rounded-xl space-y-4 border border-border-color">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-amber-700">簽約日</label>
                                <input name="contract_date" defaultValue={milestones?.contract_date} type="date" className="w-full bg-card border border-border-color rounded px-3 py-2 text-foreground focus:ring-1 focus:ring-amber-500" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-foreground/60">簽約款 (萬元)</label>
                                <input name="contract_amount" defaultValue={milestones?.contract_amount} type="number" step="0.1" className="w-full bg-card border border-border-color rounded px-3 py-2 text-foreground" />
                            </div>
                        </div>
                        {/* Signing Difference */}
                        <div className="p-3 bg-amber-500/5 rounded-lg border border-dashed border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-amber-600">簽約補差額日期</label>
                                <input name="sign_diff_date" defaultValue={milestones?.sign_diff_date} type="date" className="w-full bg-card/50 border border-border-color/50 rounded px-2 py-1 text-sm text-foreground" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-amber-600">補差額金額 (萬元)</label>
                                <input name="sign_diff_amount" defaultValue={milestones?.sign_diff_amount} type="number" step="0.1" className="w-full bg-card/50 border border-border-color/50 rounded px-2 py-1 text-sm text-foreground" />
                            </div>
                        </div>
                    </div>

                    {/* Seal & Tax */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-secondary/20 p-4 rounded-xl space-y-4 border border-border-color">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-blue-600">用印日</label>
                                <input name="seal_date" defaultValue={milestones?.seal_date} type="date" className="w-full bg-card border border-border-color rounded px-3 py-2 text-foreground focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60">用印款 (萬元)</label>
                                <input name="seal_amount" defaultValue={milestones?.seal_amount} type="number" step="0.1" className="w-full bg-card border border-border-color rounded px-2 py-1 text-sm text-foreground" />
                            </div>
                        </div>

                        <div className="bg-secondary/20 p-4 rounded-xl space-y-4 border border-border-color">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-emerald-600">完稅日</label>
                                <input name="tax_payment_date" defaultValue={milestones?.tax_payment_date} type="date" className="w-full bg-card border border-border-color rounded px-3 py-2 text-foreground focus:ring-1 focus:ring-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60">完稅款 (萬元)</label>
                                <input name="tax_amount" defaultValue={milestones?.tax_amount} type="number" step="0.1" className="w-full bg-card border border-border-color rounded px-2 py-1 text-sm text-foreground" />
                            </div>
                        </div>
                    </div>

                    {/* Transfer & Balance & Handover */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground/60">過戶日</label>
                            <input name="transfer_date" defaultValue={milestones?.transfer_date} type="date" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground" />
                            <div className="flex gap-2">
                                <select
                                    className="w-1/2 bg-secondary border border-transparent rounded px-2 py-1 text-xs text-foreground focus:outline-none cursor-pointer"
                                    onChange={(e) => {
                                        const noteInput = document.getElementById('transfer_note_input') as HTMLInputElement;
                                        if (noteInput) noteInput.value = e.target.value;
                                    }}
                                >
                                    <option value="">(速選備註)</option>
                                    <option value="訴訟">訴訟</option>
                                    <option value="卡營業登記">卡營業登記</option>
                                    <option value="外案">外案</option>
                                </select>
                                <input
                                    id="transfer_note_input"
                                    name="transfer_note"
                                    defaultValue={milestones?.transfer_note}
                                    type="text"
                                    placeholder="備註..."
                                    className="w-1/2 bg-secondary border border-transparent rounded px-2 py-1 text-xs text-foreground"
                                />
                            </div>
                        </div>

                        <div className="bg-secondary/20 p-4 rounded-xl space-y-4 border border-border-color">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-purple-600">尾款日</label>
                                <input name="balance_payment_date" defaultValue={milestones?.balance_payment_date} type="date" className="w-full bg-card border border-border-color rounded px-3 py-2 text-foreground focus:ring-1 focus:ring-purple-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60">尾款 (萬元)</label>
                                <input name="balance_amount" defaultValue={milestones?.balance_amount} type="number" step="0.1" className="w-full bg-card border border-border-color rounded px-2 py-1 text-sm text-foreground" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-red-600">交屋日</label>
                            <input name="handover_date" defaultValue={milestones?.handover_date} type="date" className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:ring-1 focus:ring-red-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-border-color"></div>

            {/* Section 3: Status & Notes */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-accent border-l-4 border-accent pl-3">狀態與備註</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">目前狀態</label>
                        <select name="status" defaultValue={initialData.status} className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors appearance-none cursor-pointer">
                            <option value="Processing">辦理中</option>
                            <option value="Closed">結案</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-red-500 flex items-center gap-2">
                            <span className="animate-pulse">⚠️</span> 應注意 (Attention)
                        </label>
                        <textarea
                            name="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={8}
                            className="w-full bg-secondary/50 border-2 border-red-500/20 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-medium leading-relaxed"
                            placeholder="在此輸入特別注意事項... (Word 解析後的明細也會放在這裡)"
                        />
                        <QuickNotes onSelect={(note) => setNotes(prev => prev ? `${prev}\n${note}` : note)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/60">代辦事項 / 更多備註</label>
                        <textarea
                            name="pending_tasks"
                            defaultValue={initialData.pending_tasks}
                            rows={5}
                            className="w-full bg-secondary border border-transparent rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                            placeholder="新增代辦事項..."
                        />
                    </div>
                </div>

                <div className="border-t border-border-color pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold text-rose-600 border-l-4 border-rose-500 pl-3 mb-4">簽約後代辦事項</h3>
                        <CaseTodos
                            caseId={initialData.id}
                            initialTodos={initialData.todos || {}}
                            items={['買方蓋印章', '賣方蓋印章', '用印款', '完稅款', '權狀印鑑', '授權', '解約排除', '規費', '設定', '稅單', '差額', '整過戶']}
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-orange-600 border-l-4 border-orange-500 pl-3 mb-4">完稅(過戶)後代辦事項</h3>
                        <CaseTodos
                            caseId={initialData.id}
                            initialTodos={initialData.todos || {}}
                            items={['整交屋', '實登', '打單', '履保', '水電', '稅費分算', '保單']}
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 flex justify-between gap-4">
                <button
                    type="button"
                    onClick={handleDelete}
                    className="px-6 py-3 rounded-xl text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                >
                    刪除案件
                </button>

                <div className="flex gap-4">
                    <Link href="/cases" className="px-6 py-2 rounded text-foreground/60 hover:bg-secondary transition-colors text-sm flex items-center">
                        取消
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary-deep text-white px-6 py-2 rounded font-medium transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                        {loading ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </div>
        </form>
    );
}
