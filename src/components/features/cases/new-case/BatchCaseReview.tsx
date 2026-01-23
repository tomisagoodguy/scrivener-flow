'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Trash2, AlertCircle, Loader2, ChevronDown, ChevronUp,
    User, DollarSign, Calendar, MapPin, Phone, Building2, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchCaseReviewProps {
    results: any[];
    onCancel: () => void;
    onSaveAll: (items: any[]) => Promise<void>;
}

export function BatchCaseReview({ results, onCancel, onSaveAll }: BatchCaseReviewProps) {
    const [saving, setSaving] = useState(false);
    const [localResults, setLocalResults] = useState(results);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const handleRemove = (id: string) => {
        setLocalResults(prev => prev.filter(item => item.id !== id));
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleProcessBatch = async () => {
        setSaving(true);
        try {
            await onSaveAll(localResults);
        } catch (err: any) {
            console.error('Batch save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const StatusBadge = ({ value, label, icon: Icon }: { value?: string | number, label: string, icon: any }) => (
        <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Icon size={12} />
                {label}
            </div>
            <div className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
                {value || '-'}
            </div>
        </div>
    );

    const DetailItem = ({ label, value, icon: Icon, highlight = false }: { label: string, value?: string | number, icon?: any, highlight?: boolean }) => (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 last:border-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                {Icon && <Icon size={14} className="text-slate-300" />}
                {label}
            </div>
            <div className={cn(
                "text-xs font-black",
                highlight ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
            )}>
                {value || '-'}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in mb-24 pb-10">
            {/* Header Control Panel */}
            <div className="sticky top-4 z-30 flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-blue-100 dark:border-blue-900 shadow-2xl shadow-blue-500/10 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <ClipboardList size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">批量審查系統</h2>
                        <p className="text-sm text-slate-500 font-bold">已準備 {localResults.length} 個案件，請對比細項後進行批量儲存。</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={saving}
                        className="flex-1 md:flex-none h-14 px-8 rounded-2xl font-black hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        全部取消
                    </Button>
                    <Button
                        onClick={handleProcessBatch}
                        disabled={saving || localResults.length === 0}
                        className="flex-1 md:flex-none h-14 px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all text-lg"
                    >
                        {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : '⚡ 一鍵建立案件'}
                    </Button>
                </div>
            </div>

            {/* List of Cards */}
            <div className="grid grid-cols-1 gap-6">
                {localResults.map((item) => {
                    const isExpanded = expandedIds.includes(item.id);
                    const data = item.data;

                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "relative overflow-hidden bg-white dark:bg-slate-900 border rounded-[2rem] transition-all duration-300 shadow-sm hover:shadow-xl",
                                item.status === 'error' ? "border-red-100 dark:border-red-900/30 shadow-red-500/5" : "border-slate-100 dark:border-slate-800"
                            )}
                        >
                            {/* Summary Header */}
                            <div className="p-6 cursor-pointer select-none lg:flex items-center gap-6" onClick={() => toggleExpand(item.id)}>
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-lg",
                                        item.status === 'error' ? "bg-red-500" : "bg-gradient-to-br from-indigo-500 to-blue-600"
                                    )}>
                                        {data.case_number?.slice(-1) || '案'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white truncate">
                                                {data.case_number || '案號未識別'}
                                            </h3>
                                            {item.status === 'error' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                {item.fileName}
                                            </span>
                                            <span className="text-xs font-black text-blue-500">
                                                買方: {data.buyer_name || '無'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 lg:mt-0 flex-[2]">
                                    <StatusBadge label="成交總價 (萬元)" value={data.total_price} icon={DollarSign} />
                                    <StatusBadge label="簽約日" value={data.contract_date} icon={Calendar} />
                                    <StatusBadge label="目前的進度狀態" value={data.status === 'Processing' ? '辦理中' : data.status} icon={ClipboardList} />
                                    <StatusBadge label="買方姓名" value={data.buyer_name} icon={User} />
                                </div>

                                <div className="flex items-center gap-2 ml-auto mt-4 lg:mt-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-blue-500">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-6 pb-8 pt-2 border-t border-slate-50 dark:border-slate-800 animate-slide-down">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                                        {/* Personnel Column */}
                                        <div className="space-y-4">
                                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                                <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold">
                                                    買
                                                </div>
                                                買方與登記人
                                            </h4>
                                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                                <DetailItem label="姓名 (買方)" value={data.buyer_name} highlight />
                                                <DetailItem label="電話 (買方)" value={data.buyer_phone} icon={Phone} />
                                                <DetailItem label="登記名義人" value={data.registrant_name} />
                                                <DetailItem label="登記人電話" value={data.registrant_phone} icon={Phone} />
                                            </div>

                                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200 pt-2">
                                                <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-bold">
                                                    賣
                                                </div>
                                                賣方與代理人
                                            </h4>
                                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                                <DetailItem label="姓名 (賣方)" value={data.seller_name} highlight />
                                                <DetailItem label="電話 (賣方)" value={data.seller_phone} icon={Phone} />
                                                <DetailItem label="代理人" value={data.agent_name} />
                                                <DetailItem label="代理人電話" value={data.agent_phone} icon={Phone} />
                                            </div>
                                        </div>

                                        {/* Payments Column */}
                                        <div className="space-y-4">
                                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                                <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                                                    <DollarSign size={14} />
                                                </div>
                                                基本案件資訊項目
                                            </h4>
                                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 h-full">
                                                <DetailItem label="成交總價 (萬元)" value={data.total_price} highlight />
                                                <DetailItem label="承辦地點" value={data.city} />
                                                <DetailItem label="目前進度狀態" value={data.status === 'Processing' ? '辦理中' : data.status} />
                                                <DetailItem label="稅單性質" value={data.tax_type} />
                                                <DetailItem label="買方貸款銀行" value={data.buyer_loan_bank} />
                                                <DetailItem label="賣方代償銀行" value={data.seller_loan_bank} />
                                                <DetailItem label="塗銷方式" value={data.cancellation_type} />
                                                <DetailItem label="履保帳號" value={data.escrow_account} />
                                            </div>
                                        </div>

                                        {/* Stages Column */}
                                        <div className="space-y-4">
                                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                                                    <Calendar size={14} />
                                                </div>
                                                重要日期與付款明細
                                            </h4>
                                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                                <DetailItem label="簽約日" value={data.contract_date} highlight />
                                                <DetailItem label="簽約款 (萬元)" value={data.contract_amount} />
                                                <DetailItem label="補差額日" value={data.sign_diff_date} />
                                                <DetailItem label="補差金額" value={data.sign_diff_amount} />
                                                <DetailItem label="用印日" value={data.seal_date} highlight />
                                                <DetailItem label="用印款 (萬元)" value={data.seal_amount} />
                                                <DetailItem label="完稅日" value={data.tax_payment_date} highlight />
                                                <DetailItem label="完稅款 (萬元)" value={data.tax_amount} />
                                                <DetailItem label="過戶日" value={data.transfer_date} />
                                                <DetailItem label="過戶備註" value={data.transfer_note} />
                                                <DetailItem label="代償日" value={data.redemption_date} />
                                                <div className="my-2 border-t border-red-100 dark:border-red-900/20"></div>
                                                <DetailItem label="交屋日 (必填)" value={data.handover_date} highlight />
                                                <DetailItem label="尾款金額 (萬元)" value={data.balance_amount} />
                                            </div>
                                        </div>
                                    </div>

                                    {data.notes && (
                                        <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">備註說明</span>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{data.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
