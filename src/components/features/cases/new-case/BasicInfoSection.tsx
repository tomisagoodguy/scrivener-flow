import React from 'react';
import { CaseFormData } from './types';

interface BasicInfoSectionProps {
    formData: CaseFormData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    setFormData: React.Dispatch<React.SetStateAction<CaseFormData>>;
    isDuplicate: boolean;
    isChecking: boolean;
    suggestedNum: string | null;
}

export function BasicInfoSection({
    formData,
    handleChange,
    setFormData,
    isDuplicate,
    isChecking,
    suggestedNum
}: BasicInfoSectionProps) {
    return (
        <div className="bg-card glass-card p-6 md:p-8 space-y-8 animate-fade-in border border-card-border">
            <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                    <span className="p-2 bg-primary/10 rounded-lg text-primary text-xl">📄</span>
                    基本案件資訊 (Basic Info)
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
        </div>
    );
}
