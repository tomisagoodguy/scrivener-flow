'use client';

import { Copy, Check, Send, Loader2, Save, Trash2 } from 'lucide-react';
import { MessageInputs } from './messageUtils';

interface MessageParametersProps {
    selectedTemplate: string;
    inputs: MessageInputs;
    setInputs: React.Dispatch<React.SetStateAction<MessageInputs>>;
    userTemplates: any[];
    onDeleteTemplate: (index: number) => void;
}

/**
 * 參數設定面板
 * 根據選擇的模板動態顯示相對應的參數輸入欄位
 */
export function MessageParameters({
    selectedTemplate,
    inputs,
    setInputs,
    userTemplates,
    onDeleteTemplate
}: MessageParametersProps) {
    return (
        <div className="space-y-6">
            {/* 刪除自訂模板按鈕 */}
            {typeof selectedTemplate === 'string' && selectedTemplate.startsWith('USER_') && (
                <button
                    onClick={() => onDeleteTemplate(parseInt(selectedTemplate.replace('USER_', '')))}
                    className="w-full py-2 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-3 h-3" /> 刪除此範本
                </button>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
                    參數設定
                </h4>

                {/* 買方姓名 (所有模板都顯示) */}
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

                {/* 預收規費專用欄位 */}
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

                {/* 付款通知專用欄位 */}
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

                {/* 會議時間與地點（簽約、用印、交屋） */}
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
    );
}

interface MessageActionsProps {
    copied: boolean;
    sending: boolean;
    isSaving: boolean;
    onCopy: () => void;
    onSave: () => void;
    onSend: () => void;
}

/**
 * 訊息操作按鈕群組
 */
export function MessageActions({
    copied,
    sending,
    isSaving,
    onCopy,
    onSave,
    onSend
}: MessageActionsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <button
                onClick={onCopy}
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
                onClick={onSave}
                disabled={isSaving}
                className="col-span-1 py-3 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                title="存為範本"
            >
                <Save className="w-5 h-5" />
                <span className="hidden md:inline">存為範本</span>
            </button>

            <button
                onClick={onSend}
                disabled={sending}
                className="col-span-2 md:col-span-1 py-3 rounded-xl bg-[#00B900] hover:bg-[#009900] text-white flex items-center justify-center gap-2 text-sm font-black shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span className="hidden md:inline">LINE 發送</span>
                <span className="md:hidden">LINE</span>
            </button>
        </div>
    );
}
