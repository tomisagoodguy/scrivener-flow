'use client';

import React from 'react';
import { DemoCase, Financials } from '@/types';
import { LoanComparisonTracker } from '../shared/LoanComparisonTracker';
import { PartyInfoBlock } from './PartyInfoBlock';
import { TransactionInfoBlock } from './TransactionInfoBlock';

interface BasicInfoSectionProps {
    initialData: DemoCase;
    financials: Financials | null | undefined;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    attributes?: Record<string, unknown>;
    loading: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
    initialData,
    financials,
    handleFileUpload,
    loading,
    attributes
}) => {
    const loanEstimates = (attributes?.loan_estimates as unknown[]) || (initialData.custom_fields?.loan_estimates as unknown[]) || [];

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

            {/* 基本識別欄位 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-bold text-foreground/50 uppercase">案件編號</label>
                    <input
                        name="case_number"
                        defaultValue={initialData.case_number}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-bold text-foreground/50 uppercase">承辦地點</label>
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
                    <label className="text-sm font-bold text-foreground/50 uppercase">買方</label>
                    <input
                        name="buyer"
                        defaultValue={initialData.buyer_name}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-bold text-foreground/50 uppercase">賣方</label>
                    <input
                        name="seller"
                        defaultValue={initialData.seller_name}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                    />
                </div>
            </div>

            {/* 交易資訊（金額、銀行、塗銷、稅型） */}
            <TransactionInfoBlock initialData={initialData} financials={financials} />

            {/* 買方貸款追蹤區塊 */}
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

            {/* 履保帳號 */}
            <div className="border-t border-border-color pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm text-foreground/60 font-medium">履保帳號</label>
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
            <PartyInfoBlock initialData={initialData} />
        </div>
    );
};
