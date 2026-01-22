import React, { useState } from 'react';
import { RedemptionInfo } from './types';

interface RedemptionEditModalProps {
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    currentData: Partial<RedemptionInfo>;
    setCurrentData: (data: Partial<RedemptionInfo>) => void;
    handleSave: (e: React.FormEvent) => void;
    handleDelete: (id: string) => void;
}

export function RedemptionEditModal({
    isEditing,
    setIsEditing,
    currentData,
    setCurrentData,
    handleSave,
    handleDelete
}: RedemptionEditModalProps) {
    // Simple state for suggestion dropdown (not fully implemented in original file, but keeping placeholder)
    const [showSuggestions, setShowSuggestions] = useState(false);

    if (!isEditing) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">
                        {currentData.id ? '編輯代償資訊' : '新增代償資訊'}
                    </h2>
                    <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                        <span className="sr-only">Close</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">銀行名稱</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={currentData.bank_name || ''}
                                onChange={(e) => {
                                    setCurrentData({ ...currentData, bank_name: e.target.value });
                                    setShowSuggestions(true);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                                placeholder="輸入銀行名稱"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">服務電話</label>
                            <input
                                type="text"
                                value={currentData.service_phone || ''}
                                onChange={(e) => setCurrentData({ ...currentData, service_phone: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">作業天數</label>
                            <input
                                type="text"
                                value={currentData.lead_time || ''}
                                onChange={(e) => setCurrentData({ ...currentData, lead_time: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">匯款/帳號資訊</label>
                        <textarea
                            value={currentData.account_info || ''}
                            onChange={(e) => setCurrentData({ ...currentData, account_info: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="銀行代碼、帳號等..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">備註</label>
                        <textarea
                            value={currentData.notes || ''}
                            onChange={(e) => setCurrentData({ ...currentData, notes: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100">
                        {currentData.id ? (
                            <button
                                type="button"
                                onClick={() => handleDelete(currentData.id!)}
                                className="text-rose-500 hover:text-rose-600 text-sm font-medium px-2 py-1 hover:bg-rose-50 rounded"
                            >
                                刪除
                            </button>
                        ) : <div></div>}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-all hover:shadow-lg active:scale-95"
                            >
                                儲存
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
