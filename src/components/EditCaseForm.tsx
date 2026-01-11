'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';
import { parseDocx } from '@/app/actions/parseDocx';
import QuickNotes from '@/components/QuickNotes';

interface EditCaseFormProps {
    initialData: DemoCase;
}

export default function EditCaseForm({ initialData }: EditCaseFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState(initialData.notes || '');
    const [errorMsg, setErrorMsg] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

    // 替代 window.confirm 的二次確認狀態
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const milestones = Array.isArray(initialData.milestones) ? initialData.milestones[0] : initialData.milestones || {};
    const financials = Array.isArray(initialData.financials) ? initialData.financials[0] : initialData.financials || {};

    useEffect(() => {
        console.log('EditCaseForm initialized with Case ID:', initialData.id);
    }, [initialData.id]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrorMsg('');
        setDebugInfo('正在準備儲存...');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        const formatDate = (val: FormDataEntryValue) => val ? val.toString() : null;

        try {
            setDebugInfo('正在更新案件主體 (cases)...');
            const { error: caseError } = await supabase
                .from('cases')
                .update({
                    case_number: data.case_number,
                    city: data.city,
                    buyer_name: data.buyer,
                    seller_name: data.seller,
                    status: data.status,
                    notes: data.notes,
                    pending_tasks: data.pending_tasks,
                    is_back_rent: data.is_back_rent === 'on',
                    tax_type: data.tax_type,
                    cancellation_type: data.cancellation_type,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', initialData.id);

            if (caseError) throw caseError;

            setDebugInfo('正在更新案件進度 (milestones)...');
            const milestoneData = {
                case_id: initialData.id,
                contract_date: formatDate(data.contract_date),
                seal_date: formatDate(data.seal_date),
                tax_payment_date: formatDate(data.tax_payment_date),
                transfer_date: formatDate(data.transfer_date),
                transfer_note: data.transfer_note?.toString() || null,
                balance_payment_date: formatDate(data.balance_payment_date),
                handover_date: formatDate(data.handover_date),
                redemption_date: formatDate(data.redemption_date),
            };

            const { data: mCheck } = await supabase.from('milestones').select('id').eq('case_id', initialData.id).maybeSingle();
            if (mCheck) {
                const { error: me } = await supabase.from('milestones').update(milestoneData).eq('id', mCheck.id);
                if (me) throw me;
            } else {
                const { error: me } = await supabase.from('milestones').insert([milestoneData]);
                if (me) throw me;
            }

            setDebugInfo('正在更新財務資訊 (financials)...');
            const financialData = {
                case_id: initialData.id,
                total_price: data.total_price ? Number(data.total_price) : null,
                buyer_bank: data.buyer_loan_bank?.toString() || null,
                seller_bank: data.seller_loan_bank?.toString() || null,
            };

            const { data: fCheck } = await supabase.from('financials').select('id').eq('case_id', initialData.id).maybeSingle();
            if (fCheck) {
                const { error: fe } = await supabase.from('financials').update(financialData).eq('id', fCheck.id);
                if (fe) throw fe;
            } else {
                const { error: fe } = await supabase.from('financials').insert([financialData]);
                if (fe) throw fe;
            }

            setDebugInfo('儲存成功，正跳轉中...');
            router.push('/cases');
            router.refresh();
        } catch (error: any) {
            console.error('Submit Error:', error);
            setErrorMsg(`儲存失敗 (${error.code || 'UNKNOWN'}): ${error.message || JSON.stringify(error)}`);
            setLoading(false);
        }
    };

    const performDelete = async () => {
        console.log('performDelete absolute start');
        setLoading(true);
        setErrorMsg('');
        setDebugInfo('開始執行刪除流程...');

        try {
            setDebugInfo('步驟 1/3: 正在刪除關聯進度 (milestones)...');
            const { error: mError } = await supabase.from('milestones').delete().eq('case_id', initialData.id);
            if (mError) throw new Error(`無法刪除進度資料: ${mError.message}`);

            setDebugInfo('步驟 2/3: 正在刪除關聯財務 (financials)...');
            const { error: fError } = await supabase.from('financials').delete().eq('case_id', initialData.id);
            if (fError) throw new Error(`無法刪除財務資料: ${fError.message}`);

            setDebugInfo('步驟 3/3: 正在刪除案件主體 (cases)...');
            const { error: cError } = await supabase.from('cases').delete().eq('id', initialData.id);
            if (cError) throw new Error(`無法刪除案件主體: ${cError.message}`);

            setDebugInfo('刪除完成，正跳轉中...');
            router.push('/cases');
            router.refresh();
        } catch (error: any) {
            console.error('Delete caught error:', error);
            setErrorMsg(`刪除失敗: ${error.message}`);
            setLoading(false);
            setShowDeleteConfirm(false);
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
                const setVal = (name: string, val?: any) => {
                    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                    if (el && val !== undefined && val !== null) {
                        el.value = val.toString();
                        if (name === 'notes') setNotes(val.toString());
                    }
                };
                if (parsedData.case_number) setVal('case_number', parsedData.case_number);
                if (parsedData.buyer_name) setVal('buyer', parsedData.buyer_name);
                if (parsedData.seller_name) setVal('seller', parsedData.seller_name);
                if (parsedData.contract_date) setVal('contract_date', parsedData.contract_date);
                if (parsedData.total_price) setVal('total_price', parsedData.total_price);
                if (parsedData.seal_date) setVal('seal_date', parsedData.seal_date);
                if (parsedData.tax_payment_date) setVal('tax_payment_date', parsedData.tax_payment_date);
                if (parsedData.transfer_date) setVal('transfer_date', parsedData.transfer_date);
                if (parsedData.balance_payment_date) setVal('balance_payment_date', parsedData.balance_payment_date);
                if (parsedData.handover_date) setVal('handover_date', parsedData.handover_date);
                alert('✅ 資料讀取完成！');
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
            {/* 錯誤與狀態提示區 */}
            {(errorMsg || loading) && (
                <div className={`p-4 rounded-xl border-2 transition-all ${errorMsg ? 'bg-red-500/10 border-red-500 text-red-600 font-bold' : 'bg-primary/10 border-primary text-primary'}`}>
                    <div className="flex items-center gap-2">
                        {errorMsg ? '❌ ' : 'ℹ️ '}
                        <span>{errorMsg || debugInfo}</span>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-primary border-l-4 border-primary pl-3">基本資料</h3>
                    <label className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs font-bold border border-primary/20">
                        <span>📄 重新讀取案件單 (.docx)</span>
                        <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} disabled={loading} />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">案件編號</label>
                        <input name="case_number" defaultValue={initialData.case_number} type="text" className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">承辦地點</label>
                        <select name="city" defaultValue={initialData.city || '士林'} className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 cursor-pointer">
                            <option value="士林">士林</option>
                            <option value="內湖">內湖</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">買方</label>
                        <input name="buyer" defaultValue={initialData.buyer_name} type="text" className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">賣方</label>
                        <input name="seller" defaultValue={initialData.seller_name} type="text" className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2" required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">成交總價 (萬)</label>
                        <input name="total_price" defaultValue={financials?.total_price} type="number" className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">買方貸款銀行</label>
                        <input name="buyer_loan_bank" defaultValue={financials?.buyer_bank} type="text" className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-orange-600 uppercase">賣方代償銀行</label>
                        <input name="seller_loan_bank" defaultValue={financials?.seller_bank} type="text" className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 border-orange-200" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase">增值稅類型</label>
                        <select name="tax_type" defaultValue={initialData.tax_type || '一般'} className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 cursor-pointer">
                            <option value="一般">一般</option>
                            <option value="自用">自用</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="border-t border-border-color"></div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-amber-600 border-l-4 border-amber-500 pl-3">進度日期</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground/40">簽約日</label>
                        <input name="contract_date" defaultValue={milestones?.contract_date} type="date" className="w-full bg-secondary/30 border border-border-color rounded px-2 py-1.5 text-sm" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground/40">用印日</label>
                        <input name="seal_date" defaultValue={milestones?.seal_date} type="date" className="w-full bg-secondary/30 border border-border-color rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground/40">完稅日</label>
                        <input name="tax_payment_date" defaultValue={milestones?.tax_payment_date} type="date" className="w-full bg-secondary/30 border border-border-color rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground/40 flex justify-between">
                            <span>過戶日</span>
                            <span className="text-[9px] text-purple-500">備註</span>
                        </label>
                        <input name="transfer_date" defaultValue={milestones?.transfer_date} type="date" className="w-full bg-secondary/30 border border-border-color rounded px-2 py-1.5 text-sm" />
                        <input name="transfer_note" defaultValue={milestones?.transfer_note} type="text" placeholder="備註..." className="w-full bg-secondary/20 border border-border-color rounded px-2 py-1 text-[10px] focus:bg-white/50 transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground/40 text-blue-500">尾款日</label>
                        <input name="balance_payment_date" defaultValue={milestones?.balance_payment_date} type="date" className="w-full bg-secondary/30 border border-border-color rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground/40">代償日</label>
                        <input name="redemption_date" defaultValue={milestones?.redemption_date} type="date" className="w-full bg-secondary/30 border border-border-color rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground/40 text-red-500">交屋日</label>
                        <input name="handover_date" defaultValue={milestones?.handover_date} type="date" className="w-full bg-secondary/30 border border-border-color rounded px-2 py-1.5 text-sm" />
                    </div>
                </div>
            </div>

            <div className="border-t border-border-color"></div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-rose-500">⚠️ 應注意 (Attention)</h4>
                        <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="w-full bg-secondary/40 border-2 border-rose-100 rounded-xl p-3 text-sm" />
                        <QuickNotes onSelect={(note) => setNotes(p => p ? `${p}\n${note}` : note)} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-accent">目前狀態</h4>
                        <select name="status" defaultValue={initialData.status} className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm cursor-pointer mb-4">
                            <option value="Processing">辦理中</option>
                            <option value="Closed">結案</option>
                        </select>
                        <h4 className="text-sm font-bold text-foreground/40">其他代辦事項</h4>
                        <textarea name="pending_tasks" defaultValue={initialData.pending_tasks} rows={3} className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground/40">塗銷方式</h4>
                    <select name="cancellation_type" defaultValue={initialData.cancellation_type || '代書塗銷'} className="w-full bg-secondary/40 border border-border-color rounded-xl p-3 text-sm cursor-pointer">
                        <option value="代書塗銷">代書塗銷</option>
                        <option value="賣方自辦">賣方自辦</option>
                        <option value="無">無</option>
                    </select>
                </div>
            </div>

            <div className="pt-8 flex justify-between gap-4">
                <div className="flex flex-col gap-2">
                    {showDeleteConfirm ? (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-bold"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={performDelete}
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-red-600 text-white text-sm font-black shadow-lg shadow-red-500/30 active:scale-95"
                            >
                                {loading ? '處理中...' : '確認刪除'}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={loading}
                            className="px-6 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold border border-red-100 flex items-center gap-2"
                        >
                            🗑️ 刪除案件
                        </button>
                    )}
                </div>

                <div className="flex gap-4">
                    <Link href="/cases" className="px-6 py-3 rounded-xl hover:bg-secondary transition-all text-sm font-bold border border-transparent flex items-center">
                        取消編輯
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary-deep text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? '儲存中...' : '✅ 儲存並返回'}
                    </button>
                </div>
            </div>
        </form>
    );
}
