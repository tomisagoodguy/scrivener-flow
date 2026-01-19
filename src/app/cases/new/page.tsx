'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { parseDocx } from '@/app/actions/parseDocx';
import QuickNotes from '@/components/shared/QuickNotes';

interface CaseFormData {
    case_number: string;
    city: string;
    district: string;
    status: string;
    total_price: string;
    tax_type: string;
    buyer_loan_bank: string;
    seller_loan_bank: string;
    cancellation_type: string;
    escrow_account: string;
    buyer_name: string;
    buyer_phone: string;
    registrant_name: string;
    registrant_phone: string;
    seller_name: string;
    seller_phone: string;
    agent_name: string;
    agent_phone: string;
    contract_date: string;
    contract_amount: string;
    sign_diff_date: string;
    sign_diff_amount: string;
    seal_date: string;
    seal_amount: string;
    tax_payment_date: string;
    tax_amount: string;
    transfer_date: string;
    transfer_note: string;
    redemption_date: string;
    handover_date: string;
    balance_amount: string;
    notes: string;
}

const initialFormData: CaseFormData = {
    case_number: '',
    city: '台北(士)',
    district: '',
    status: 'Processing',
    total_price: '',
    tax_type: '一般',
    buyer_loan_bank: '',
    seller_loan_bank: '',
    cancellation_type: '代書塗銷',
    escrow_account: '',
    buyer_name: '',
    buyer_phone: '',
    registrant_name: '',
    registrant_phone: '',
    seller_name: '',
    seller_phone: '',
    agent_name: '',
    agent_phone: '',
    contract_date: '',
    contract_amount: '',
    sign_diff_date: '',
    sign_diff_amount: '',
    seal_date: '',
    seal_amount: '',
    tax_payment_date: '',
    tax_amount: '',
    transfer_date: '',
    transfer_note: '',
    redemption_date: '',
    handover_date: '',
    balance_amount: '',
    notes: '',
};

export default function NewCasePage() {
    const router = useRouter();
    const [formData, setFormData] = useState<CaseFormData>(initialFormData);
    const [errorMsg, setErrorMsg] = useState('');
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [suggestedNum, setSuggestedNum] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Initial check for latest case number to suggest next one
    useEffect(() => {
        const fetchLatest = async () => {
            const { data } = await supabase
                .from('cases')
                .select('case_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data?.case_number) {
                // If it looks like a number, try to increment it
                const match = data.case_number.match(/(\d+)$/);
                if (match) {
                    const num = parseInt(match[1]);
                    const nextNum = (num + 1).toString().padStart(match[1].length, '0');
                    const suggested = data.case_number.replace(/\d+$/, nextNum);
                    setSuggestedNum(suggested);
                }
            }
        };
        fetchLatest();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'case_number') {
            checkDuplicate(value);
        }
    };

    const checkDuplicate = async (caseNum: string) => {
        if (!caseNum) {
            setIsDuplicate(false);
            if (errorMsg.includes('案號')) setErrorMsg('');
            return;
        }
        setIsChecking(true);
        const { data, error } = await supabase
            .from('cases')
            .select('id')
            .eq('case_number', caseNum)
            .maybeSingle();

        if (data) {
            setIsDuplicate(true);
            setErrorMsg(`❌ 案號 「${caseNum}」 已經存在，請更換一個案號。`);
        } else {
            setIsDuplicate(false);
            if (!errorMsg.includes('資料庫建立失敗')) setErrorMsg(''); // Clear if it was a duplicate error
        }
        setIsChecking(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        try {
            setLoading(true);
            const parsedData = await parseDocx(uploadFormData);
            console.log('Parsed Data:', parsedData);

            const rawDebug = (parsedData as any).debug_text || '';

            if (!parsedData.case_number && !parsedData.buyer_name) {
                alert('⚠️ 無法識別資料！請確認檔案內容格式。\n\n讀取到的文字預覽:\n' + rawDebug);
            } else {
                setFormData(prev => ({
                    ...prev,
                    case_number: parsedData.case_number || prev.case_number,
                    buyer_name: parsedData.buyer_name || prev.buyer_name,
                    buyer_phone: parsedData.buyer_phone || prev.buyer_phone,
                    seller_name: parsedData.seller_name || prev.seller_name,
                    seller_phone: parsedData.seller_phone || prev.seller_phone,
                    registrant_name: parsedData.registrant_name || prev.registrant_name,
                    registrant_phone: parsedData.registrant_phone || prev.registrant_phone,
                    agent_name: parsedData.agent_name || prev.agent_name,
                    agent_phone: parsedData.agent_phone || prev.agent_phone,
                    escrow_account: parsedData.escrow_account || prev.escrow_account,
                    total_price: parsedData.total_price?.toString() || prev.total_price,

                    contract_date: parsedData.contract_date || prev.contract_date,
                    contract_amount: parsedData.contract_amount?.toString() || prev.contract_amount,

                    sign_diff_date: parsedData.sign_diff_date || prev.sign_diff_date,
                    sign_diff_amount: parsedData.sign_diff_amount?.toString() || prev.sign_diff_amount,

                    seal_date: parsedData.seal_date || prev.seal_date,
                    seal_amount: parsedData.seal_amount?.toString() || prev.seal_amount,

                    tax_payment_date: parsedData.tax_payment_date || prev.tax_payment_date,
                    tax_amount: parsedData.tax_amount?.toString() || prev.tax_amount,

                    balance_payment_date: parsedData.balance_payment_date || prev.balance_payment_date,
                    balance_amount: parsedData.balance_amount?.toString() || prev.balance_amount,

                    handover_date: parsedData.handover_date || prev.handover_date,
                    transfer_date: parsedData.transfer_date || prev.transfer_date,
                }));

                // If case number found, check duplicate
                if (parsedData.case_number) {
                    checkDuplicate(parsedData.case_number);
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('>>> handleSubmit triggered with state:', formData);

        try {
            setLoading(true);
            const formatDate = (val: string) => (val ? val : null);

            console.log('Preparing insert payload...');

            // 1. Insert Case
            const casePayload = {
                case_number: formData.case_number,
                buyer_name: formData.buyer_name,
                buyer_phone: formData.buyer_phone || null,
                seller_name: formData.seller_name,
                seller_phone: formData.seller_phone || null,
                escrow_account: formData.escrow_account,
                registrant_name: formData.registrant_name,
                registrant_phone: formData.registrant_phone,
                agent_name: formData.agent_name,
                agent_phone: formData.agent_phone,

                status: formData.status,
                city: formData.city,
                district: formData.district,
                notes: formData.notes,

                tax_type: formData.tax_type,
                user_id: (await supabase.auth.getUser()).data.user?.id,
            };

            if (!casePayload.user_id) {
                console.warn('⚠️ Creating case without user_id (Not logged in)');
            }

            console.log('Inserting Case Payload:', casePayload);

            // 1. Check if Case exists to handle "Half-created" states
            const { data: existingCase } = await supabase
                .from('cases')
                .select('id')
                .eq('case_number', formData.case_number)
                .maybeSingle();

            let newCase;
            if (existingCase) {
                console.log('Case already exists, updating instead of inserting...', existingCase.id);
                const { data: updatedCase, error: caseError } = await supabase
                    .from('cases')
                    .update(casePayload)
                    .eq('id', existingCase.id)
                    .select()
                    .single();
                if (caseError) throw caseError;
                newCase = updatedCase;
            } else {
                const { data: insertedCase, error: caseError } = await supabase
                    .from('cases')
                    .insert([casePayload])
                    .select()
                    .single();

                if (caseError) {
                    console.error('Supabase Case Error (Raw):', JSON.stringify(caseError, null, 2));

                    const errorTitle = '資料庫建立失敗';
                    let displayMsg = '';

                    if (caseError.code === '23505') {
                        displayMsg = `❌ 案號 「${formData.case_number}」 已經存在，請更換一個案號。`;
                    } else {
                        const errMsg = caseError.message || '未知錯誤 (Unknown Error)';
                        displayMsg = `${errorTitle}:\n[${caseError.code || 'NULL'}] ${errMsg}`;
                    }

                    setErrorMsg(displayMsg);
                    setLoading(false);
                    return;
                }
                newCase = insertedCase;
            }

            if (!newCase) throw new Error('案件建立或更新後無回傳資料');

            // 2. Insert Milestones
            const milestonePayload = {
                case_id: newCase.id,
                contract_date: formatDate(formData.contract_date),
                seal_date: formatDate(formData.seal_date),
                tax_payment_date: formatDate(formData.tax_payment_date),
                transfer_date: formatDate(formData.transfer_date),
                balance_payment_date: formatDate(formData.balance_payment_date),
                redemption_date: formatDate(formData.redemption_date),
                handover_date: formatDate(formData.handover_date),
                transfer_note: formData.transfer_note || null,

                contract_amount: formData.contract_amount ? Number(formData.contract_amount) : null,
                sign_diff_date: formatDate(formData.sign_diff_date),
                sign_diff_amount: formData.sign_diff_amount ? Number(formData.sign_diff_amount) : null,
                seal_amount: formData.seal_amount ? Number(formData.seal_amount) : null,
                tax_amount: formData.tax_amount ? Number(formData.tax_amount) : null,
                balance_amount: formData.balance_amount ? Number(formData.balance_amount) : null,
            };

            console.log('Upserting Milestone Payload:', milestonePayload);

            const { data: existingMilestone } = await supabase.from('milestones').select('id').eq('case_id', newCase.id).maybeSingle();

            const milestoneResult = existingMilestone
                ? await supabase.from('milestones').update(milestonePayload).eq('id', existingMilestone.id)
                : await supabase.from('milestones').insert([milestonePayload]);

            if (milestoneResult.error) {
                console.error('Milestone Error:', milestoneResult.error);
                const mDetails = JSON.stringify(milestoneResult.error, Object.getOwnPropertyNames(milestoneResult.error));
                setErrorMsg(
                    (prev) => (prev ? prev + '\n\n' : '') + '里程碑資料儲存失敗 (Milestone Error):\n' + mDetails
                );
                setLoading(false);
                return;
            }

            // 3. Insert Financials
            const financialsPayload = {
                case_id: newCase.id,
                total_price: formData.total_price ? Number(formData.total_price) : null,
                buyer_bank: formData.buyer_loan_bank || null,
                seller_bank: formData.seller_loan_bank || null,
            };

            console.log('Upserting Financials Payload:', financialsPayload);
            const { data: existingFin } = await supabase.from('financials').select('id').eq('case_id', newCase.id).maybeSingle();

            const finResult = existingFin
                ? await supabase.from('financials').update(financialsPayload).eq('id', existingFin.id)
                : await supabase.from('financials').insert([financialsPayload]);

            if (finResult.error) {
                console.error('Financial Error', finResult.error);
                setErrorMsg(
                    (prev) => (prev ? prev + '\n\n' : '') + '財務資料儲存失敗 (Financial Error):\n' + finResult.error.message
                );
                setLoading(false);
                return;
            }

            router.push('/cases?status=Processing');
            router.refresh();
        } catch (error: any) {
            console.error('Catch Error:', error);
            setErrorMsg('發生未預期的錯誤 (Catch):\n' + (error.message || JSON.stringify(error)));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">新增案件</h1>
                    <p className="text-foreground/50 font-bold mt-2">Create New Case Process</p>
                </div>
                <div className="flex gap-4">
                    <label className="bg-primary hover:bg-primary-deep text-white px-4 py-2 rounded-full cursor-pointer transition-colors text-sm flex items-center gap-2 shadow-sm font-bold">
                        <span>📄 重新讀取案件單 (.docx)</span>
                        <input
                            type="file"
                            accept=".docx"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={loading}
                        />
                    </label>
                    <Link
                        href="/"
                        className="bg-card border border-border px-6 py-2 rounded-full hover:bg-secondary transition-colors text-foreground text-sm flex items-center shadow-sm font-bold"
                    >
                        ← 返回列表
                    </Link>
                </div>
            </header>

            <form
                onSubmit={handleSubmit}
                className="glass-card p-6 md:p-10 animate-slide-up space-y-8 border border-card-border overflow-hidden"
            >
                <div className="bg-card glass-card p-6 md:p-8 space-y-8 animate-fade-in border border-card-border">
                    <div className="border-b border-border pb-4">
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                            <span className="p-2 bg-primary/10 rounded-lg text-primary text-xl">📄</span>
                            基本案件資訊
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-foreground/70 font-bold uppercase tracking-wider">
                                案件編號 (Case ID)
                            </label>
                            <input
                                name="case_number"
                                type="text"
                                className={`w-full bg-secondary/50 border ${isDuplicate ? 'border-red-500 ring-2 ring-red-500/20' : 'border-border'} rounded-xl px-4 py-4 min-h-[56px] text-foreground font-black focus:ring-2 focus:ring-primary/20 transition-all font-sans`}
                                required
                                value={formData.case_number}
                                onChange={handleChange}
                                placeholder={suggestedNum ? `建議序號: ${suggestedNum}` : '請輸入案號'}
                            />
                            {isChecking && <p className="text-[10px] text-primary animate-pulse font-bold mt-1">正在檢查案號重複性...</p>}
                            {isDuplicate && <p className="text-xs text-red-500 font-bold mt-1">此案號已存在，請修正</p>}
                            {!isDuplicate && !isChecking && suggestedNum && !formData.case_number && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, case_number: suggestedNum }))}
                                    className="text-[11px] text-blue-500 hover:text-blue-700 font-bold mt-1 underline cursor-pointer"
                                >
                                    使用建議編號: {suggestedNum}
                                </button>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground/50 uppercase">承辦地點</label>
                            <select
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full text-lg font-bold bg-secondary/30 border-2 border-primary/20 rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            >
                                <option value="台北(士)">台北(士)</option>
                                <option value="台北(內)">台北(內)</option>
                                <option value="新北(內)">新北(內)</option>
                            </select>
                            <input type="hidden" name="district" value="" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-foreground/70 font-bold">目前進度狀態</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-4 min-h-[56px] text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold"
                            >
                                <option value="Processing">辦理中</option>
                                <option value="Closed">已結案</option>
                                <option value="Cancelled">解約</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-primary font-bold">成交總價 (萬元)</label>
                            <input
                                name="total_price"
                                type="number"
                                step="0.1"
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground font-black focus:ring-2 focus:ring-primary/20 transition-all"
                                required
                                value={formData.total_price}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-foreground/70 font-bold">稅單性質</label>
                            <select
                                name="tax_type"
                                value={formData.tax_type}
                                onChange={handleChange}
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold"
                            >
                                <option value="一般">一般</option>
                                <option value="一生一次">一生一次</option>
                                <option value="一生一屋">一生一屋</option>
                                <option value="道路用地">道路用地</option>
                                <option value="一生一次+道路用地">一生一次+道路用地</option>
                                <option value="一生一屋+道路用地">一生一屋+道路用地</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-foreground/70 font-bold">買方貸款銀行</label>
                            <input
                                name="buyer_loan_bank"
                                type="text"
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                value={formData.buyer_loan_bank}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-foreground/70 font-bold">賣方代償銀行</label>
                            <input
                                name="seller_loan_bank"
                                type="text"
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                value={formData.seller_loan_bank}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-foreground/70 font-bold">塗銷方式</label>
                            <select
                                name="cancellation_type"
                                value={formData.cancellation_type}
                                onChange={handleChange}
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold"
                            >
                                <option value="代書塗銷">代書塗銷</option>
                                <option value="賣方自辦">賣方自辦</option>
                                <option value="無">無</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs text-foreground/60 font-medium">履保帳號</label>
                            <input
                                name="escrow_account"
                                type="text"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-wider"
                                placeholder="968282..."
                                value={formData.escrow_account}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Involved Parties */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                        {/* Buyer Side */}
                        <div className="bg-secondary/30 p-4 rounded-xl space-y-3 border border-border">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> 買方
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/50">姓名</label>
                                    <input
                                        name="buyer_name"
                                        type="text"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold"
                                        required
                                        value={formData.buyer_name}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/50">電話</label>
                                    <input
                                        name="buyer_phone"
                                        type="text"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium"
                                        value={formData.buyer_phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-foreground/40 uppercase font-bold">
                                        登記名義人
                                    </label>
                                    <input
                                        name="registrant_name"
                                        type="text"
                                        className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-bold"
                                        placeholder="同買方"
                                        value={formData.registrant_name}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-foreground/40 uppercase font-bold">
                                        登記人電話
                                    </label>
                                    <input
                                        name="registrant_phone"
                                        type="text"
                                        className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-medium"
                                        value={formData.registrant_phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seller Side */}
                        <div className="bg-secondary/30 p-4 rounded-xl space-y-3 border border-border">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span> 賣方
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/50">姓名</label>
                                    <input
                                        name="seller_name"
                                        type="text"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold"
                                        required
                                        value={formData.seller_name}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/50">電話</label>
                                    <input
                                        name="seller_phone"
                                        type="text"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium"
                                        value={formData.seller_phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-foreground/40 uppercase font-bold">代理人</label>
                                    <input
                                        name="agent_name"
                                        type="text"
                                        className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-bold"
                                        value={formData.agent_name}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-foreground/40 uppercase font-bold">
                                        代理人電話
                                    </label>
                                    <input
                                        name="agent_phone"
                                        type="text"
                                        className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-medium"
                                        value={formData.agent_phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Section 2: Dates */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-amber-500 flex items-center gap-3">
                        <span className="p-2 bg-amber-500/10 rounded-lg text-amber-500">📅</span>
                        重要日期與付款明細
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Contract Stage */}
                        <div className="bg-secondary/30 p-5 rounded-2xl space-y-4 border border-border">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-amber-600">簽約日</label>
                                <input
                                    name="contract_date"
                                    type="date"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    required
                                    value={formData.contract_date}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60 font-medium">簽約款 (萬元)</label>
                                <input
                                    name="contract_amount"
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={formData.contract_amount}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="p-3 bg-amber-500/5 rounded-xl border border-dashed border-amber-500/30 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-600 uppercase">補差額日</label>
                                    <input
                                        name="sign_diff_date"
                                        type="date"
                                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-3.5 text-[11px] text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={formData.sign_diff_date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-600 uppercase">補差金額</label>
                                    <input
                                        name="sign_diff_amount"
                                        type="number"
                                        step="0.1"
                                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-3.5 text-[11px] text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={formData.sign_diff_amount}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seal & Tax */}
                        <div className="bg-secondary/30 p-5 rounded-2xl space-y-4 border border-border">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-blue-500">用印日</label>
                                <input
                                    name="seal_date"
                                    type="date"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={formData.seal_date}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60 font-medium">用印款 (萬元)</label>
                                <input
                                    name="seal_amount"
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={formData.seal_amount}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="border-t border-border pt-2">
                                <div className="space-y-1 pt-2">
                                    <label className="text-xs font-bold text-emerald-500">完稅日</label>
                                    <input
                                        name="tax_payment_date"
                                        type="date"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={formData.tax_payment_date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60 font-medium">完稅款 (萬元)</label>
                                    <input
                                        name="tax_amount"
                                        type="number"
                                        step="0.1"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={formData.tax_amount}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Transfer & Note */}
                        <div className="bg-secondary/30 p-5 rounded-2xl space-y-4 border border-border">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-purple-500">過戶日</label>
                                <input
                                    name="transfer_date"
                                    type="date"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={formData.transfer_date}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60 font-medium">過戶備註</label>
                                <input
                                    name="transfer_note"
                                    type="text"
                                    placeholder="例如：代書辦理"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={formData.transfer_note}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="border-t border-border pt-2">
                                <div className="space-y-1 pt-2">
                                    <label className="text-xs font-bold text-orange-600">代償日</label>
                                    <input
                                        name="redemption_date"
                                        type="date"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={formData.redemption_date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Handover & Balance */}
                        <div className="bg-primary/5 p-5 rounded-2xl space-y-4 border border-primary/20 ring-1 ring-primary/5">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-red-500 uppercase tracking-tighter flex items-center gap-2">
                                    交屋日{' '}
                                    <span className="text-[10px] bg-red-500 text-white px-1.5 rounded-full">必填</span>
                                </label>
                                <input
                                    name="handover_date"
                                    type="date"
                                    className="w-full bg-background border border-primary/30 rounded-xl px-4 py-4 min-h-[56px] text-foreground font-black focus:ring-2 focus:ring-red-500/20 transition-all"
                                    required
                                    value={formData.handover_date}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60 font-bold">尾款金額 (萬元)</label>
                                <input
                                    name="balance_amount"
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={formData.balance_amount}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Section 3: Status & Notes */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                        <span className="p-2 bg-foreground/5 rounded-lg text-foreground">📝</span>
                        待辦與備註
                    </h3>

                    <div className="space-y-4">
                        <textarea
                            name="notes"
                            rows={4}
                            placeholder="例如：需做輻射檢測、約定交屋地點..."
                            value={formData.notes}
                            onChange={handleChange}
                            className="w-full bg-secondary/30 border border-border rounded-2xl px-6 py-4 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                        />
                        <QuickNotes onSelect={(note) => setFormData(prev => ({ ...prev, notes: prev.notes ? `${prev.notes}\n${note}` : note }))} />
                    </div>
                </div>

                <div className="pt-6 flex flex-col md:flex-row items-center justify-end gap-6">
                    {/* DEBUG ERROR DISPLAY */}
                    {errorMsg && (
                        <div className="flex-1 bg-red-500/10 border-l-4 border-red-500 text-red-500 p-4 rounded font-mono text-sm">
                            <p className="font-black mb-1">發生錯誤：</p>
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex gap-4 w-full md:w-auto">
                        <Link
                            href="/"
                            className="px-8 py-4 bg-secondary/50 text-foreground font-bold rounded-2xl hover:bg-secondary transition-all border border-border flex items-center justify-center"
                        >
                            取消
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 md:flex-none md:min-w-[200px] bg-primary hover:bg-primary-deep text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-100 flex items-center justify-center gap-2 text-lg"
                        >
                            {loading ? '儲存中...' : '🚀 建立案件 (Save Case)'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
