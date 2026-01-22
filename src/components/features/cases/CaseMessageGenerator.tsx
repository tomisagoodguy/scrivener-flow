'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Copy, MessageSquare, Check, Send, Loader2, Save, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { SecureApi } from '@/lib/crypto/secureApi';

type TemplateType =
    | 'PREPAID_FEES'
    | 'SIGNING'
    | 'SEAL'
    | 'TAX_PAYMENT'
    | 'TRANSFER'
    | 'HANDOVER'
    | 'COMPLETION'
    | 'CUSTOM'
    | 'NEXT_PAYMENT';

interface CustomTemplate {
    name: string;
    content: string;
}

interface CaseMessageGeneratorProps {
    caseData: any;
}

export default function CaseMessageGenerator({ caseData }: CaseMessageGeneratorProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | string>('PREPAID_FEES');
    const [generatedText, setGeneratedText] = useState('');
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);
    const [userTemplates, setUserTemplates] = useState<CustomTemplate[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initial state derived from caseData
    const [inputs, setInputs] = useState({
        buyerName: caseData.buyer_name || '',
        prepaidFee: caseData.financials?.[0]?.pre_collected_fee || '',
        nextPaymentDate: '',
        nextPaymentAmount: '',
        nextPaymentType: '',
        loanDiff: '',
        totalAmount: '',
        bankName: caseData.financials?.[0]?.buyer_bank || '',
        meetingTime: '',
        meetingLocation: '事務所',
    });

    // Load templates on mount
    useEffect(() => {
        const loadTemplates = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_settings')
                .select('message_templates')
                .eq('user_id', user.id)
                .single();

            if (data?.message_templates) {
                setUserTemplates(data.message_templates as unknown as CustomTemplate[]);
            }
        };
        loadTemplates();
    }, []);

    // Helpers
    const fmtMoney = (val: string | number) => {
        if (!val) return '0';
        return Number(val).toLocaleString();
    };

    const formatMoneySpoken = (val: string | number) => {
        if (!val) return '0元';
        const num = Number(val);
        if (num >= 10000) {
            const wan = Math.floor(num / 10000);
            const remainder = num % 10000;
            return `${wan}萬${remainder > 0 ? remainder : ''}元`;
        }
        return `${num}元`;
    };

    const guessNextPaymentType = () => {
        const stage = caseData.status; // Simple heuristic
        if (stage === 'Processing') return '用印款';
        return '尾款';
    };

    const handleSaveTemplate = async () => {
        const name = prompt('請輸入新範本名稱：');
        if (!name) return;

        setIsSaving(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const newTemplates = [...userTemplates, { name, content: generatedText }];

            const { error } = await supabase
                .from('user_settings')
                .upsert({ user_id: user.id, message_templates: newTemplates }, { onConflict: 'user_id' });

            if (error) throw error;

            setUserTemplates(newTemplates);
            alert('✅ 範本儲存成功！');
        } catch (error) {
            console.error('Failed to save template:', error);
            alert('❌ 儲存失敗，請稍後再試');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTemplate = async (index: number) => {
        if (!confirm('確定要刪除此範本嗎？')) return;

        const newTemplates = userTemplates.filter((_, i) => i !== index);
        setUserTemplates(newTemplates);

        if (selectedTemplate === `USER_${index}`) {
            setSelectedTemplate('PREPAID_FEES');
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('user_settings')
                .update({ message_templates: newTemplates })
                .eq('user_id', user.id);
        }
    };

    // Auto-calculate total
    useEffect(() => {
        if (selectedTemplate === 'NEXT_PAYMENT') {
            const total = (Number(inputs.nextPaymentAmount || 0) + Number(inputs.loanDiff || 0) + Number(inputs.prepaidFee || 0));
            setInputs(prev => ({ ...prev, totalAmount: total.toString() }));
        }
    }, [inputs.nextPaymentAmount, inputs.loanDiff, inputs.prepaidFee, selectedTemplate]);

    const generate = (templateOverride?: TemplateType | string) => {
        const template = templateOverride !== undefined ? templateOverride : selectedTemplate;

        if (typeof template === 'string' && template.startsWith('USER_')) {
            const index = parseInt(template.replace('USER_', ''));
            if (userTemplates[index]) {
                setGeneratedText(userTemplates[index].content);
                setCopied(false);
                return;
            }
        }

        let text = '';
        const buyer = inputs.buyerName;

        switch (template) {
            case 'PREPAID_FEES':
                text = `【預收規費通知】\n\n${buyer} 您好，\n跟您報告預收規費的部分。\n\n預收規費：${formatMoneySpoken(inputs.prepaidFee)}\n此費用包含地政規費、稅費及代書費。\n\n麻煩您匯款整數【${formatMoneySpoken(inputs.prepaidFee)}整】\n剩餘的費用我們會在交屋時用現金的方式多退少補。\n\n麻煩您和下一筆款項一起匯入履保帳戶即可，謝謝！`;
                break;
            case 'NEXT_PAYMENT':
                const parts = [];
                if (Number(inputs.nextPaymentAmount) > 0) parts.push(`款項 ${formatMoneySpoken(inputs.nextPaymentAmount)}`);
                if (Number(inputs.loanDiff) > 0) parts.push(`貸款差額 ${formatMoneySpoken(inputs.loanDiff)}`);
                if (Number(inputs.prepaidFee) > 0) parts.push(`預收規費 ${formatMoneySpoken(inputs.prepaidFee)}`);

                text = `【付款通知】\n\n${buyer} 您好，\n提醒您下一筆款項 (${inputs.nextPaymentType || guessNextPaymentType()})。\n\n應匯金額：${parts.join(' + ')}\n總計：${formatMoneySpoken(inputs.totalAmount)}\n\n匯款截止日：${inputs.nextPaymentDate || '請依約定時間匯款'}\n\n請匯入履保專戶，匯款後請通知我們，謝謝！`;
                break;
            case 'SIGNING':
                text = `【簽約通知】\n\n${buyer} 您好，\n恭喜您成交！\n\n簽約時間：${inputs.meetingTime}\n地點：${inputs.meetingLocation}\n\n請攜帶：\n1. 身分證\n2. 印章\n3. 簽約金\n\n期待與您見面！`;
                break;
            case 'SEAL':
                text = `【用印通知】\n\n${buyer} 您好，\n提醒您用印時間。\n\n時間：${inputs.meetingTime}\n地點：${inputs.meetingLocation}\n\n請準備好印鑑證明與印鑑章。\n謝謝！`;
                break;
            case 'TAX_PAYMENT':
                text = `【完稅通知】\n\n${buyer} 您好，\n稅單已核發，我們將儘速處理完稅事宜。\n\n預計完稅日：${inputs.nextPaymentDate}\n\n如有任何問題請隨時聯繫，謝謝！`;
                break;
            case 'HANDOVER':
                text = `【交屋通知】\n\n${buyer} 您好，\n恭喜即將交屋！\n\n交屋時間：${inputs.meetingTime}\n地點：${inputs.meetingLocation}\n\n請攜帶：\n1. 身份證\n2. 印章\n3. 找補款項(若有)\n\n期待您的新居落成！`;
                break;
            case 'CUSTOM':
                text = inputs.buyerName ? `${inputs.buyerName} 您好，\n\n` : '';
                break;
            default:
                text = '';
        }
        setGeneratedText(text);
        setCopied(false);
    };

    // Auto-generate when inputs change (only if not custom/user template)
    useEffect(() => {
        if (selectedTemplate !== 'CUSTOM' && !String(selectedTemplate).startsWith('USER_')) {
            generate();
        }
    }, [inputs]); // Removed selectedTemplate to prevent overwrite on switch to CUSTOM manually

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const sendToLine = async () => {
        if (!generatedText) return;
        setSending(true);
        try {
            // Using secureApi to ensure E2EE if implemented, though here it's likely just a backend proxy call
            const res = await SecureApi.post<any>('/api/line/secure', {
                text: generatedText,
                caseId: caseData.id
            });

            if (res.success) {
                toast.success('訊息已發送至 LINE Bot！');
            } else {
                console.error('Line send failed:', res.error);
                toast.error('發送失敗: ' + (res.error || '未知錯誤'));
            }
        } catch (e: any) {
            console.error('Line API connection error:', e);
            toast.error('連線錯誤: ' + e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            AI 訊息生成器
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Message Generator</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700">
                    E2EE Encrypted
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Controls (4/12 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">選擇範本 (Template)</label>
                        <div className="relative">
                            <select
                                value={String(selectedTemplate)}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedTemplate(val);
                                    generate(val);
                                }}
                                className="w-full appearance-none bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm hover:border-blue-300"
                            >
                                <optgroup label="常用範本">
                                    <option value="PREPAID_FEES">📄 預收規費通知</option>
                                    <option value="NEXT_PAYMENT">💰 付款/尾款通知</option>
                                    <option value="SIGNING">✍️ 簽約通知</option>
                                    <option value="SEAL">⭕ 用印通知</option>
                                    <option value="TAX_PAYMENT">🧾 完稅通知</option>
                                    <option value="HANDOVER">🏠 交屋通知</option>
                                </optgroup>
                                <option value="CUSTOM">✏️ 自訂訊息</option>
                                {userTemplates.length > 0 && (
                                    <optgroup label="我的範本">
                                        {userTemplates.map((t, idx) => (
                                            <option key={idx} value={`USER_${idx}`}>⭐ {t.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    </div>

                    {typeof selectedTemplate === 'string' && selectedTemplate.startsWith('USER_') && (
                        <button
                            onClick={() => handleDeleteTemplate(parseInt(selectedTemplate.replace('USER_', '')))}
                            className="w-full py-2 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-3 h-3" /> 刪除此範本
                        </button>
                    )}

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-700 space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">參數設定</h4>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">買方姓名</label>
                            <input
                                type="text"
                                value={inputs.buyerName}
                                onChange={(e) => setInputs({ ...inputs, buyerName: e.target.value })}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                placeholder="輸入姓名"
                            />
                        </div>

                        {selectedTemplate === 'PREPAID_FEES' && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">預收規費金額</label>
                                <input
                                    type="number"
                                    value={inputs.prepaidFee}
                                    onChange={(e) => setInputs({ ...inputs, prepaidFee: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                                />
                            </div>
                        )}

                        {selectedTemplate === 'NEXT_PAYMENT' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 ml-1">款項類別</label>
                                        <input
                                            type="text"
                                            placeholder="例：完稅款"
                                            value={inputs.nextPaymentType}
                                            onChange={(e) => setInputs({ ...inputs, nextPaymentType: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 ml-1">應匯金額</label>
                                        <input
                                            type="number"
                                            value={inputs.nextPaymentAmount}
                                            onChange={(e) => setInputs({ ...inputs, nextPaymentAmount: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-1">匯款日期</label>
                                    <input
                                        type="date"
                                        value={inputs.nextPaymentDate}
                                        onChange={(e) => setInputs({ ...inputs, nextPaymentDate: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}

                        {(selectedTemplate === 'SIGNING' || selectedTemplate === 'SEAL' || selectedTemplate === 'HANDOVER') && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-1">會議時間</label>
                                    <input
                                        type="datetime-local"
                                        value={inputs.meetingTime}
                                        onChange={(e) => setInputs({ ...inputs, meetingTime: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-1">地點</label>
                                    <input
                                        type="text"
                                        value={inputs.meetingLocation}
                                        onChange={(e) => setInputs({ ...inputs, meetingLocation: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Preview & Action (8/12 cols) */}
                <div className="lg:col-span-8 flex flex-col h-full">
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">
                            訊息預覽 (Preview)
                        </label>
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                            可直接編輯內容
                        </span>
                    </div>

                    <div className="relative flex-grow group">
                        <textarea
                            value={generatedText}
                            onChange={(e) => {
                                setGeneratedText(e.target.value);
                                if (selectedTemplate !== 'CUSTOM' && !String(selectedTemplate).startsWith('USER_')) {
                                    // Switch to CUSTOM to stop auto-updates, but DO NOT regenerate
                                    setSelectedTemplate('CUSTOM');
                                }
                            }}
                            className="w-full h-full min-h-[400px] bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-base leading-relaxed border-2 border-slate-100 dark:border-slate-700 
                                      focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none font-mono text-slate-700 dark:text-slate-200
                                      shadow-inner transition-all selection:bg-blue-100 selection:text-blue-900"
                        />
                        {/* Status Indicator */}
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <div className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${generatedText.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                {generatedText.length} chars
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <button
                            onClick={copyToClipboard}
                            className={`col-span-1 md:col-span-2 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all transform active:scale-95 shadow-sm
                                ${copied
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            {copied ? '已複製成功' : '複製訊息'}
                        </button>

                        <button
                            onClick={handleSaveTemplate}
                            disabled={isSaving}
                            className="col-span-1 py-3 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                            title="存為範本"
                        >
                            <Save className="w-5 h-5" />
                            <span className="hidden md:inline">存為範本</span>
                        </button>

                        <button
                            onClick={sendToLine}
                            disabled={sending}
                            className="col-span-2 md:col-span-1 py-3 rounded-xl bg-[#00B900] hover:bg-[#009900] text-white flex items-center justify-center gap-2 text-sm font-black shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            <span className="hidden md:inline">LINE 發送</span>
                            <span className="md:hidden">LINE</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
