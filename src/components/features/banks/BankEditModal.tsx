import React from 'react';
import { Bank } from '@/types';
import { Plus, Edit, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface BankEditModalProps {
    currentBank: Partial<Bank>;
    setCurrentBank: React.Dispatch<React.SetStateAction<Partial<Bank>>>;
    setIsEditing: (value: boolean) => void;
    handleSave: () => void;
    addContact: () => void;
    updateContact: (index: number, field: string, value: string) => void;
    removeContact: (index: number) => void;
}

/**
 * BankEditModal 組件
 * 銀行資料編輯表單模態框
 */
export function BankEditModal({
    currentBank,
    setCurrentBank,
    setIsEditing,
    handleSave,
    addContact,
    updateContact,
    removeContact,
}: BankEditModalProps) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 z-[100] fixed inset-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 animate-fade-in relative ring-1 ring-slate-900/5">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4 sticky top-0 bg-white dark:bg-slate-800 z-10 pt-2">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        {currentBank.id ? <Edit className="text-blue-500" /> : <Plus className="text-blue-500" />}
                        {currentBank.id ? '編輯銀行資訊' : '新增銀行資料'}
                    </h2>
                    <button onClick={() => setIsEditing(false)} className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors pointer-events-auto">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-4 border-blue-500 pl-3">基本資料</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">銀行名稱 <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-bold focus:ring-2 focus:ring-blue-500/50 outline-none"
                                    value={currentBank.name || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, name: e.target.value })}
                                    placeholder="例如：台北富邦"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">分行</label>
                                <input
                                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500/50 outline-none"
                                    value={currentBank.branch || ''}
                                    onChange={e => setCurrentBank({ ...currentBank, branch: e.target.value })}
                                    placeholder="選填"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Redemption Info */}
                    <div className="space-y-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-4 border-purple-500 pl-3">代償/塗銷資料</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                value={currentBank.redemption_phone || ''}
                                onChange={e => setCurrentBank({ ...currentBank, redemption_phone: e.target.value })}
                                placeholder="客服電話"
                            />
                            <input
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                value={currentBank.redemption_days || ''}
                                onChange={e => setCurrentBank({ ...currentBank, redemption_days: e.target.value })}
                                placeholder="工作天數"
                            />
                            <input
                                className="col-span-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                value={currentBank.redemption_account || ''}
                                onChange={e => setCurrentBank({ ...currentBank, redemption_account: e.target.value })}
                                placeholder="匯款專戶帳號"
                            />
                            <input
                                className="col-span-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                value={currentBank.redemption_location || ''}
                                onChange={e => setCurrentBank({ ...currentBank, redemption_location: e.target.value })}
                                placeholder="領取地點"
                            />
                        </div>
                    </div>

                    {/* Contacts Editor */}
                    <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-end">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-4 border-green-500 pl-3">聯絡窗口名單</h3>
                            <button type="button" onClick={addContact} className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors">
                                <Plus size={14} /> 新增窗口
                            </button>
                        </div>

                        <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl max-h-[300px] overflow-y-auto">
                            {!currentBank.contacts?.length && (
                                <div className="text-center text-slate-400 py-4 text-sm">目前沒有聯絡人，請點擊上方按鈕新增。</div>
                            )}
                            {currentBank.contacts?.map((contact: any, index: number) => {
                                const emails = contact.email ? contact.email.split(/[,;]/).map((e: string) => e.trim()).filter(Boolean) : [];
                                const hasMultipleEmails = emails.length > 1;

                                return (
                                    <div key={index} className="flex gap-2 items-start bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                                            <input
                                                placeholder="姓名"
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                                                value={contact.name || ''}
                                                onChange={e => updateContact(index, 'name', e.target.value)}
                                            />
                                            <input
                                                placeholder="分行/職稱"
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                                                value={contact.branch || ''}
                                                onChange={e => updateContact(index, 'branch', e.target.value)}
                                            />
                                            <input
                                                placeholder="電話/分機"
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                                                value={contact.phone || ''}
                                                onChange={e => updateContact(index, 'phone', e.target.value)}
                                            />
                                            <div className="relative">
                                                <input
                                                    placeholder="Email"
                                                    className={`p-2 rounded-lg border text-sm w-full ${hasMultipleEmails ? 'border-orange-300 bg-orange-50/30 dark:bg-orange-900/10' : 'border-slate-200 dark:border-slate-600'}`}
                                                    value={contact.email || ''}
                                                    onChange={e => updateContact(index, 'email', e.target.value)}
                                                />
                                                {hasMultipleEmails && (
                                                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                        {emails.length} 個信箱
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {hasMultipleEmails && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newContacts = [...(currentBank.contacts || [])];
                                                    const [original] = newContacts.splice(index, 1);
                                                    emails.forEach((email: string) => {
                                                        newContacts.push({
                                                            name: original.name,
                                                            branch: original.branch,
                                                            phone: original.phone,
                                                            email: email
                                                        });
                                                    });
                                                    setCurrentBank({ ...currentBank, contacts: newContacts });
                                                    toast.success(`已拆分為 ${emails.length} 筆獨立聯絡人`);
                                                }}
                                                className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-colors shrink-0"
                                                title={`拆分為 ${emails.length} 筆聯絡人`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 12h-5"></path>
                                                    <path d="M17 18h-5"></path>
                                                    <path d="M17 6h-5"></path>
                                                    <path d="M3 12h5"></path>
                                                    <path d="M3 18h5"></path>
                                                    <path d="M3 6h5"></path>
                                                </svg>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => removeContact(index)}
                                            className="text-slate-400 hover:text-red-500 p-2"
                                            title="刪除"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Loan Conditions */}
                    <div className="col-span-1 md:col-span-2 space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            貸款條件與規則備註
                        </h3>
                        <textarea
                            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all font-mono text-sm leading-relaxed"
                            rows={8}
                            value={currentBank.loan_conditions || ''}
                            onChange={e => setCurrentBank({ ...currentBank, loan_conditions: e.target.value })}
                            placeholder={`輸入詳細規則...\n1. 首購成數限制...\n2. 寬限期規定...\n3. 特殊案件處理方式...`}
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 rounded-xl font-black bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        儲存資料
                    </button>
                </div>
            </div>
        </div>
    );
}
