'use client';

import React, { useState, useEffect } from 'react';
import { DemoCase, Financials, Milestone } from '@/types';
import { Copy, MessageSquare, Check, RefreshCw, Send, Loader2 } from 'lucide-react';
import { sendLineMessage } from '@/app/actions/lineNotify';

interface CaseMessageGeneratorProps {
    caseData: DemoCase;
}

type TemplateType =
    | 'PREPAID_FEES'
    | 'NEXT_PAYMENT'
    | 'CANCELLATION_SELF'
    | 'HANDOVER_NOTICE'
    | 'BANK_INFO_QUERY'
    | 'BANK_INFO_EXPLAIN'
    | 'TAX_REPORT_BUYER'
    | 'TAX_REPORT_SELLER'
    | 'SEAL_APPOINTMENT'
    | 'CUSTOM';

export default function CaseMessageGenerator({ caseData }: CaseMessageGeneratorProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('PREPAID_FEES');
    const [generatedText, setGeneratedText] = useState('');
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);

    // Extraction helpers
    const financials: Partial<Financials> = caseData.financials?.[0] || {};
    const milestones: Partial<Milestone> = caseData.milestones?.[0] || {};

    // Local state for variable inputs not in DB
    const [inputs, setInputs] = useState({
        nextPaymentType: '用印款',
        nextPaymentDate: '',
        nextPaymentAmount: '',
        loanDiff: '',
        prepaidFee: financials.pre_collected_fee?.toString() || '0',
        totalAmount: '',

        // Tax details
        deedTax: '',
        landStamp: '',
        houseStamp: '',
        landValueTax1: '',
        landValueTax2: '',

        // Handover
        handoverLocation: '台北市士林區承德路四段116號',

        // Sealing
        sealLocation: '台北市士林區承德路四段116號',

        // Cancellation
        cancellationOffice: '台北市任意一個地政事務所',
    });

    // Formatting currency (traditional)
    const fmtMoney = (val: string | number | undefined | null) => {
        if (!val) return '0';
        return Number(val).toLocaleString('zh-TW');
    };

    // Formatting currency (spoken - 口語化)
    const formatMoneySpoken = (val: string | number | undefined | null) => {
        if (!val) return '0元';
        const num = Number(val);
        if (num >= 100000000) {
            // 億
            const yi = Math.floor(num / 100000000);
            const remainder = num % 100000000;
            if (remainder === 0) return `${yi}億元`;
            const wan = Math.floor(remainder / 10000);
            if (wan === 0) return `${yi}億元`;
            return `${yi}億${wan}萬元`;
        } else if (num >= 10000) {
            // 萬
            const wan = Math.floor(num / 10000);
            const remainder = num % 10000;
            if (remainder === 0) return `${wan}萬元`;
            // 如果有零頭但小於1000，忽略不顯示（口語化）
            if (remainder < 1000) return `${wan}萬元`;
            return `${wan}萬${remainder}元`;
        } else {
            return `${num.toLocaleString('zh-TW')}元`;
        }
    };

    // 智慧判斷下一筆款項名稱
    const guessNextPaymentType = (): string => {
        const now = new Date();
        const dates = [
            { date: milestones.seal_appointment, name: '用印款' },
            { date: milestones.tax_payment_appointment, name: '完稅款' },
            { date: milestones.repayment_appointment, name: '代償款' },
            { date: milestones.handover_appointment, name: '交屋款' }
        ];

        // 找出最近的未來日期
        const upcoming = dates
            .filter(d => d.date && new Date(d.date) > now)
            .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

        return upcoming[0]?.name || '用印款';
    };

    // Formatting date
    const fmtDate = (val: string | undefined | null) => {
        if (!val) return '___月___日';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '___月___日';
        return `${d.getMonth() + 1}月${d.getDate()}日`;
    };

    const fmtTime = (val: string | undefined | null) => {
        if (!val) return '___:___';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '___:___';
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // Auto-calculate total for next payment
    useEffect(() => {
        if (selectedTemplate === 'NEXT_PAYMENT') {
            const p1 = Number(inputs.nextPaymentAmount) || 0;
            const p2 = Number(inputs.loanDiff) || 0;
            const p3 = Number(inputs.prepaidFee) || 0;
            setInputs(prev => ({ ...prev, totalAmount: (p1 + p2 + p3).toString() }));
        }
    }, [inputs.nextPaymentAmount, inputs.loanDiff, inputs.prepaidFee, selectedTemplate]);

    // Generator Logic
    const generate = () => {
        let text = '';
        switch (selectedTemplate) {
            case 'PREPAID_FEES':
                text = `預收規費

跟您報告預收規費的部分
預收規費：
費用的部分用於繳納您的
地政規費、稅費及代書費
麻煩您匯款整數【${fmtMoney(inputs.prepaidFee)}元整】
剩餘的費用我們會在交屋時用現金的方式多退少補

預收規費的部分麻煩您和下一筆款項一起匯入即可`;
                break;

            case 'NEXT_PAYMENT':
                const paymentType = inputs.nextPaymentType || guessNextPaymentType();
                const parts = [];
                if (inputs.nextPaymentAmount && Number(inputs.nextPaymentAmount) > 0) {
                    parts.push(formatMoneySpoken(inputs.nextPaymentAmount));
                }
                if (inputs.loanDiff && Number(inputs.loanDiff) > 0) {
                    parts.push(`貸款差額${formatMoneySpoken(inputs.loanDiff)}`);
                }
                if (inputs.prepaidFee && Number(inputs.prepaidFee) > 0) {
                    parts.push(`預收規費${formatMoneySpoken(inputs.prepaidFee)}`);
                }

                text = `報告後續款項

您這邊下一次款項(${paymentType})
時間是 ${inputs.nextPaymentDate}
麻煩您匯入${parts.join('+')}共計${formatMoneySpoken(inputs.totalAmount)}入履保帳戶`;
                break;

            case 'CANCELLATION_SELF':
                text = `屋主自辦塗銷流程
帶
1.抵押權塗銷同意書(紅色)
2.他項權利證明書(綠色)
3.身分證
4.印章
到${inputs.cancellationOffice}辦理塗銷

塗銷完成以後麻煩拍收據給業務
地址：${inputs.handoverLocation}`; // Using handover location as agency address usually
                break;

            case 'HANDOVER_NOTICE':
                text = `交屋通知

您好
跟您報告交屋需帶文件
❶簽約時給的黑色資料夾(方便收納，當天會有一些資料交給您帶回)
❷印章
❸存摺

時間:${fmtDate(milestones.handover_appointment)} ${fmtTime(milestones.handover_appointment)}
地點:${inputs.handoverLocation}`;
                break;

            case 'BANK_INFO_QUERY':
                const today = new Date();
                text = `問代償資訊

您好：案件已過戶完成，接下來將進行代償作業；因個資法關係，需麻煩您致電至${financials.seller_bank || '銀行'}客服中心確認代償資訊，謝謝您。

${today.getMonth() + 1}月${today.getDate()}日代償資訊：
➊金額：
➋帳號 ：
➌戶名 ：
➍匯款分行：
➎銀行聯絡電話：`;
                break;

            case 'BANK_INFO_EXPLAIN':
                text = `解釋代償：
您好：目前因有個資法緣故，銀行回覆清償具體數字只能告知您本人，要再麻煩你致電詢問。`;
                break;

            case 'TAX_REPORT_BUYER':
                text = `報告稅款

您好，我們稅單的部分已經核發了
跟您報告稅款的部分
契稅金額是${fmtMoney(inputs.deedTax)}元
土地印花稅${fmtMoney(inputs.landStamp)}元
建物印花稅${fmtMoney(inputs.houseStamp)}元

我們預計${inputs.nextPaymentDate}會從履保出款繳納您的稅款

上述稅費的部分會從預收規費出款
不會再另外跟您收費🙇🏻‍♀️`;
                break;

            case 'TAX_REPORT_SELLER':
                text = `${caseData.seller_name}先生/小姐您好，我們稅單的部分已經核發了
跟您報告稅款的部分
土地增值稅金額是${inputs.landValueTax1 ? fmtMoney(inputs.landValueTax1) + '元' : ''} ${inputs.landValueTax2 ? '+' + fmtMoney(inputs.landValueTax2) + '元' : ''}
共${fmtMoney(Number(inputs.landValueTax1 || 0) + Number(inputs.landValueTax2 || 0))}元
待買方完稅款匯入後
會從履保出款繳納您的稅`;
                break;

            case 'SEAL_APPOINTMENT':
                text = `${caseData.buyer_name || caseData.seller_name}先生/小姐您好
我是永慶房屋陳代書
跟您約${fmtDate(milestones.seal_appointment)} ${fmtTime(milestones.seal_appointment)}
${inputs.sealLocation}辦理用印手續
麻煩您準備
1.土地建物權狀
2.印鑑證明(用途：不動產登記）
3.辦理印鑑證明印章`;
                break;
            case 'CUSTOM':
                // In custom mode, we don't overwrite the existing state
                return;
        }
        setGeneratedText(text);
        setCopied(false);
    };

    // Auto-generate on template switch or data change
    useEffect(() => {
        // Pre-fill some defaults based on case data
        if (selectedTemplate === 'NEXT_PAYMENT') {
            const guessedType = guessNextPaymentType();
            setInputs(p => ({
                ...p,
                nextPaymentType: guessedType,
                nextPaymentDate: fmtDate(milestones.seal_appointment)
            }));
        }

        // Only auto-generate if NOT in custom mode
        if (selectedTemplate !== 'CUSTOM') {
            generate();
        }
    }, [selectedTemplate, inputs, caseData]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendToLine = async () => {
        if (!generatedText) return;
        setSending(true);
        try {
            const result = await sendLineMessage(generatedText);
            if (result.success) {
                alert('✅ 訊息已成功發送至您的 Line！');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                alert(`❌ 發送失敗: ${result.error || '未知錯誤'}\n請確認您已設定 Line Channel Access Token 及 User ID。`);
            }
        } catch (error: any) {
            alert(`❌ 發生錯誤: ${error.message}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-card glass-card p-6 rounded-xl border border-border-color space-y-6">
            <div className="flex items-center gap-3 border-b border-border-color pb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">智慧訊息生成 (AI Message Generator)</h3>
                <div className="ml-auto text-xs bg-secondary/50 px-2 py-1 rounded text-foreground/50">
                    Experimental
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground/50 uppercase">選擇訊息範本</label>
                        <select
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 font-bold cursor-pointer hover:bg-secondary/70 transition-all"
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)}
                        >
                            <optgroup label="款項與規費">
                                <option value="PREPAID_FEES">預收規費已收通知</option>
                                <option value="NEXT_PAYMENT">報告後續款項與明細</option>
                            </optgroup>
                            <optgroup label="稅務申報">
                                <option value="TAX_REPORT_BUYER">報告稅款 (買方-契稅/印花)</option>
                                <option value="TAX_REPORT_SELLER">報告稅款 (賣方-土增稅)</option>
                            </optgroup>
                            <optgroup label="程序與通知">
                                <option value="SEAL_APPOINTMENT">用印手續預約</option>
                                <option value="HANDOVER_NOTICE">交屋需帶文件與時間</option>
                                <option value="CANCELLATION_SELF">屋主自辦塗銷流程</option>
                            </optgroup>
                            <optgroup label="代償溝通">
                                <option value="BANK_INFO_QUERY">詢問銀行代償資訊</option>
                                <option value="BANK_INFO_EXPLAIN">解釋為何需本人詢問</option>
                            </optgroup>
                            <optgroup label="自定義">
                                <option value="CUSTOM">✨ 自定義訊息 (Free Edit)</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Dynamic Inputs based on Template */}
                    <div className="bg-secondary/20 p-4 rounded-xl space-y-3 animate-fade-in">
                        <h4 className="text-xs font-black text-foreground/40 uppercase mb-2">參數設定</h4>

                        {selectedTemplate === 'PREPAID_FEES' && (
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60">預收金額</label>
                                <input
                                    type="number"
                                    value={inputs.prepaidFee}
                                    onChange={e => setInputs({ ...inputs, prepaidFee: e.target.value })}
                                    className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                />
                            </div>
                        )}

                        {selectedTemplate === 'NEXT_PAYMENT' && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">款項名稱</label>
                                    <input
                                        value={inputs.nextPaymentType}
                                        onChange={e => setInputs({ ...inputs, nextPaymentType: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">日期</label>
                                    <input
                                        type="text"
                                        value={inputs.nextPaymentDate}
                                        onChange={e => setInputs({ ...inputs, nextPaymentDate: e.target.value })}
                                        placeholder="8月5日"
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">匯入金額</label>
                                    <input
                                        type="number"
                                        value={inputs.nextPaymentAmount}
                                        onChange={e => setInputs({ ...inputs, nextPaymentAmount: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">貸款差額</label>
                                    <input
                                        type="number"
                                        value={inputs.loanDiff}
                                        onChange={e => setInputs({ ...inputs, loanDiff: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                            </>
                        )}

                        {selectedTemplate === 'TAX_REPORT_BUYER' && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">契稅</label>
                                    <input
                                        type="number"
                                        value={inputs.deedTax}
                                        onChange={e => setInputs({ ...inputs, deedTax: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">土地印花</label>
                                    <input
                                        type="number"
                                        value={inputs.landStamp}
                                        onChange={e => setInputs({ ...inputs, landStamp: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">建物印花</label>
                                    <input
                                        type="number"
                                        value={inputs.houseStamp}
                                        onChange={e => setInputs({ ...inputs, houseStamp: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">預計繳納日</label>
                                    <input
                                        value={inputs.nextPaymentDate}
                                        onChange={e => setInputs({ ...inputs, nextPaymentDate: e.target.value })}
                                        placeholder="2/11"
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                            </>
                        )}
                        {selectedTemplate === 'TAX_REPORT_SELLER' && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">一般土增稅</label>
                                    <input
                                        type="number"
                                        value={inputs.landValueTax1}
                                        onChange={e => setInputs({ ...inputs, landValueTax1: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-foreground/60">自用土增稅 (如有)</label>
                                    <input
                                        type="number"
                                        value={inputs.landValueTax2}
                                        onChange={e => setInputs({ ...inputs, landValueTax2: e.target.value })}
                                        className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                    />
                                </div>
                            </>
                        )}
                        {(selectedTemplate === 'SEAL_APPOINTMENT' || selectedTemplate === 'HANDOVER_NOTICE') && (
                            <div className="space-y-1">
                                <label className="text-xs text-foreground/60">地點</label>
                                <input
                                    value={selectedTemplate === 'SEAL_APPOINTMENT' ? inputs.sealLocation : inputs.handoverLocation}
                                    onChange={e => setInputs({
                                        ...inputs,
                                        [selectedTemplate === 'SEAL_APPOINTMENT' ? 'sealLocation' : 'handoverLocation']: e.target.value
                                    })}
                                    className="w-full text-sm bg-white/50 border border-border-color rounded px-2 py-1"
                                />
                            </div>
                        )}
                        {selectedTemplate === 'CUSTOM' && (
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 animate-fade-in">
                                <p className="text-xs text-primary font-bold">手動編輯模式中</p>
                                <p className="text-[10px] text-foreground/50 mt-1">您可以直接修改右側文字。若要恢復範本，請從左側選單重新選擇。</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Area */}
                <div className="col-span-1 lg:col-span-2 flex flex-col h-full">
                    <div className="relative flex-grow">
                        <textarea
                            value={generatedText}
                            onChange={(e) => {
                                setGeneratedText(e.target.value);
                                // 當使用者手動打字時，自動切換到自定義模式，避免被 useEffect 覆蓋
                                if (selectedTemplate !== 'CUSTOM') {
                                    setSelectedTemplate('CUSTOM');
                                }
                            }}
                            placeholder="在此輸入訊息內容..."
                            className="w-full h-full min-h-[300px] p-6 bg-secondary/30 rounded-xl border border-border-color focus:ring-2 focus:ring-primary/20 transition-all resize-none font-mono text-sm leading-relaxed"
                        />
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button
                                onClick={generate}
                                className="p-2 bg-white/80 hover:bg-white text-foreground/70 rounded-full shadow-sm backdrop-blur transition-all"
                                title="重新生成 (Reset)"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={handleSendToLine}
                            disabled={sending}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-bold transition-all shadow-md active:scale-95 ${sending ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#06C755] hover:bg-[#05b34c] hover:shadow-lg'
                                }`}
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {sending ? '傳送中...' : '傳送至 Line Bot'}
                        </button>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all shadow-md active:scale-95 ${copied
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-primary text-white hover:bg-primary/90'
                                }`}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? '已複製！' : '複製內容'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
