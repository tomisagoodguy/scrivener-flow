import React from 'react';
import { DemoCase, Financials } from '@/types';

const CANCELLATION_OPTIONS = ['代書塗銷', '賣方自辦', '無', '先塗二胎', '線上塗銷'] as const;

interface TransactionInfoBlockProps {
    initialData: DemoCase;
    financials: Financials | null | undefined;
}

export function TransactionInfoBlock({ initialData, financials }: TransactionInfoBlockProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
                <label className="text-sm font-bold text-foreground/50 uppercase">成交總價 (萬)</label>
                <input
                    name="total_price"
                    defaultValue={financials?.total_price ?? undefined}
                    type="number"
                    className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-bold text-emerald-600 uppercase">預收規費</label>
                <input
                    name="pre_collected_fee"
                    defaultValue={financials?.pre_collected_fee ?? undefined}
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
                <label className="text-sm font-bold text-foreground/50 uppercase">買方貸款銀行</label>
                <input
                    id="buyer_loan_bank_input"
                    name="buyer_loan_bank"
                    defaultValue={financials?.buyer_bank ?? undefined}
                    type="text"
                    className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                    placeholder="請輸入或從下方選取..."
                />
            </div>
            <div className="space-y-1 col-span-1">
                <label className="text-sm font-bold text-orange-600 uppercase">賣方代償銀行 & 設定金額</label>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        name="seller_loan_bank"
                        defaultValue={financials?.seller_bank ?? undefined}
                        type="text"
                        placeholder="銀行名稱"
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 border-orange-200 focus:ring-2 focus:ring-orange-200 transition-all font-bold"
                    />
                    <div className="relative">
                        <input
                            name="seller_redemption_amount"
                            defaultValue={financials?.seller_redemption_amount ?? undefined}
                            type="text"
                            placeholder="設定額"
                            className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 border-orange-200 focus:ring-2 focus:ring-orange-200 transition-all font-bold pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/50 font-bold">萬</span>
                    </div>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-bold text-orange-600 uppercase">塗銷方式</label>
                <div className="flex flex-col gap-2">
                    <select
                        defaultValue={CANCELLATION_OPTIONS.includes(initialData?.cancellation_type as typeof CANCELLATION_OPTIONS[number]) ? initialData.cancellation_type : 'CUSTOM'}
                        onChange={(e) => {
                            const input = document.getElementById('cancellation_type_input') as HTMLInputElement;
                            const val = e.target.value;
                            if (val === 'CUSTOM') {
                                if (input) { input.style.display = 'block'; input.value = ''; input.focus(); }
                            } else {
                                if (input) { input.style.display = 'none'; input.value = val; }
                            }
                        }}
                        className="w-full bg-secondary/50 border border-border-color rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                    >
                        {CANCELLATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="CUSTOM">其他 (手動輸入...)</option>
                    </select>
                    <input
                        id="cancellation_type_input"
                        name="cancellation_type"
                        defaultValue={initialData.cancellation_type}
                        type="text"
                        style={{ display: CANCELLATION_OPTIONS.includes(initialData?.cancellation_type as typeof CANCELLATION_OPTIONS[number]) ? 'none' : 'block' }}
                        className="w-full bg-primary/5 border-2 border-primary/20 rounded-lg px-3 py-2 text-foreground font-black focus:ring-2 focus:ring-primary/40 transition-all text-sm"
                        placeholder="請輸入塗銷方式..."
                    />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-bold text-foreground/50 uppercase">稅單性質</label>
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
    );
}
