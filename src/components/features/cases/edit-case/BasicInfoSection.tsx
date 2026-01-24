'use client';

import React from 'react';
import { DemoCase } from '@/types';

interface BasicInfoSectionProps {
    initialData: DemoCase;
    financials: any;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    loading: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
    initialData,
    financials,
    handleFileUpload,
    loading
}) => {
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

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                        name="buyer_loan_bank"
                        defaultValue={financials?.buyer_bank}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-orange-600 uppercase">賣方代償銀行</label>
                    <input
                        name="seller_loan_bank"
                        defaultValue={financials?.seller_bank}
                        type="text"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 border-orange-200 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
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
        </div>
    );
};
