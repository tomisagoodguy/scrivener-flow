'use client';

import React from 'react';
import { DemoCase } from '@/types';
import { LoanComparisonTracker } from '../shared/LoanComparisonTracker';

interface BasicInfoSectionProps {
    initialData: DemoCase;
    financials: any;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    attributes?: Record<string, any>;
    loading: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
    initialData,
    financials,
    handleFileUpload,
    loading,
    attributes
}) => {
    // Determine initial values for loan estimates
    // Priority: 1. attributes state (from useEditCase) 2. initialData.custom_fields (legacy/server-side populated)
    const loanEstimates = attributes?.loan_estimates || initialData.custom_fields?.loan_estimates || [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-primary border-l-4 border-primary pl-3">基本資料</h3>
                <label className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs font-bold border border-primary/20">
                    <span>📄 重新讀取代書備忘錄(.docx)</span>
                    <input
                        type="file"
                        accept=".docx"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={loading}
                    />
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/50 uppercase">案件編號</label>
                    <input
                        name="case_number"
                        defaultValue={initialData.case_number}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/50 uppercase">承辦地點</label>
                    <select
                        name="city"
                        defaultValue={initialData.city || '台北(士)'}
                        className="w-full text-lg font-bold bg-secondary/30 border-2 border-primary/20 rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    >
                        <option value="台北(士)">台北(士)</option>
                        <option value="台北(內)">台北(內)</option>
                        <option value="新北(內)">新北(內)</option>
                    </select>
                    <input type="hidden" name="district" value="" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/50 uppercase">買方</label>
                    <input
                        name="buyer"
                        defaultValue={initialData.buyer_name}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/50 uppercase">賣方</label>
                    <input
                        name="seller"
                        defaultValue={initialData.seller_name}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/50 uppercase">成交總價 (萬)</label>
                    <input
                        name="total_price"
                        defaultValue={financials?.total_price}
                        type="number"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-600 uppercase">預收規費</label>
                    <input
                        name="pre_collected_fee"
                        defaultValue={financials?.pre_collected_fee}
                        type="number"
                        step="0.1"
                        placeholder="輸入 5 代表 5萬"
                        onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0 && val < 100) {
                                e.target.value = (val * 10000).toString();
                            }
                        }}
                        className="w-full bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-700 font-bold"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/50 uppercase">買方貸款銀行</label>
                    <input
                        id="buyer_loan_bank_input"
                        name="buyer_loan_bank"
                        defaultValue={financials?.buyer_bank}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                        placeholder="請輸入或從下方選取..."
                    />
                </div>
                <div className="space-y-1 col-span-1">
                    <label className="text-xs font-bold text-orange-600 uppercase">賣方代償銀行 & 設定金額</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            name="seller_loan_bank"
                            defaultValue={financials?.seller_bank}
                            type="text"
                            placeholder="銀行名稱"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 border-orange-200 focus:ring-2 focus:ring-orange-200 transition-all font-bold"
                        />
                        <div className="relative">
                            <input
                                name="seller_redemption_amount"
                                defaultValue={financials?.seller_redemption_amount}
                                type="text"
                                placeholder="設定額"
                                className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 border-orange-200 focus:ring-2 focus:ring-orange-200 transition-all font-bold pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/50 font-bold">萬</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-orange-600 uppercase">塗銷方式</label>
                    <div className="flex flex-col gap-2">
                        <select
                            defaultValue={['代書塗銷', '賣方自辦', '無', '先塗二胎', '線上塗銷'].includes(initialData?.cancellation_type ?? '') ? initialData.cancellation_type : 'CUSTOM'}
                            onChange={(e) => {
                                const input = document.getElementById('cancellation_type_input') as HTMLInputElement;
                                const val = e.target.value;
                                if (val === 'CUSTOM') {
                                    if (input) {
                                        input.style.display = 'block';
                                        input.value = '';
                                        input.focus();
                                    }
                                } else {
                                    if (input) {
                                        input.style.display = 'none';
                                        input.value = val;
                                    }
                                }
                            }}
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        >
                            <option value="代書塗銷">代書塗銷</option>
                            <option value="賣方自辦">賣方自辦</option>
                            <option value="無">無</option>
                            <option value="先塗二胎">先塗二胎</option>
                            <option value="線上塗銷">線上塗銷</option>
                            <option value="CUSTOM">其他 (手動輸入...)</option>
                        </select>
                        <input
                            id="cancellation_type_input"
                            name="cancellation_type"
                            defaultValue={initialData.cancellation_type}
                            type="text"
                            style={{ display: ['代書塗銷', '賣方自辦', '無', '先塗二胎', '線上塗銷'].includes(initialData?.cancellation_type ?? '') ? 'none' : 'block' }}
                            className="w-full bg-primary/5 border-2 border-primary/20 rounded-lg px-3 py-2 text-foreground font-black focus:ring-2 focus:ring-primary/40 transition-all text-sm"
                            placeholder="請輸入塗銷方式..."
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/50 uppercase">稅單性質</label>
                    <select
                        name="tax_type"
                        defaultValue={initialData.tax_type || '一般'}
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                    >
                        <option value="一般">一般</option>
                        <option value="一生一次">一生一次</option>
                        <option value="一生一屋">一生一屋</option>
                        <option value="道路用地">道路用地</option>
                        <option value="一生一次+道路用地">一生一次+道路用地</option>
                        <option value="一生一屋+道路用地">一生一屋+道路用地</option>
                    </select>
                </div>
            </div>

            {/* 買方貸款追蹤區塊 - 獨立展開 */}
            <div className="mt-2">
                <LoanComparisonTracker
                    initialValue={JSON.stringify(loanEstimates)}
                    onFinalBankSelect={(bankName) => {
                        const el = document.getElementById('buyer_loan_bank_input') as HTMLInputElement;
                        if (el) el.value = bankName;
                    }}
                    fieldName="loan_estimates_json"
                />
            </div>

            <div className="border-t border-border-color pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs text-foreground/60 font-medium">履保帳號</label>
                        <input
                            name="escrow_account"
                            defaultValue={initialData.escrow_account}
                            type="text"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-wider"
                            placeholder="968282..."
                        />
                    </div>
                </div>
            </div>

            {/* 買賣雙方詳細資訊 */}
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
                                defaultValue={initialData.buyer_name}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-foreground/50">電話</label>
                            <input
                                name="buyer_phone"
                                type="text"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium"
                                defaultValue={initialData.buyer_phone}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                        <div className="space-y-1">
                            <label className="text-[10px] text-foreground/40 uppercase font-bold">登記名義人</label>
                            <input
                                name="registrant_name"
                                type="text"
                                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-bold"
                                placeholder="同買方"
                                defaultValue={initialData.registrant_name}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-foreground/40 uppercase font-bold">登記人電話</label>
                            <input
                                name="registrant_phone"
                                type="text"
                                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-medium"
                                defaultValue={initialData.registrant_phone}
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
                                defaultValue={initialData.seller_name}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-foreground/50">電話</label>
                            <input
                                name="seller_phone"
                                type="text"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium"
                                defaultValue={initialData.seller_phone}
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
                                defaultValue={initialData.agent_name}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-foreground/40 uppercase font-bold">代理人電話</label>
                            <input
                                name="agent_phone"
                                type="text"
                                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-medium"
                                defaultValue={initialData.agent_phone}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
