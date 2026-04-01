import React from 'react';
import { CaseFormData } from './types';

interface DatesAndPaymentsSectionProps {
    formData: CaseFormData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DatesAndPaymentsSection({ formData, handleChange }: DatesAndPaymentsSectionProps) {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black text-amber-500 flex items-center gap-3">
                <span className="p-2 bg-amber-500/10 rounded-lg text-amber-500">📅</span>
                重要日期與付款明細
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Contract Stage */}
                <div className="bg-secondary/30 p-5 rounded-2xl space-y-4 border border-border">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-amber-600">簽約日</label>
                        <input
                            name="contract_date"
                            type="date"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            required
                            value={formData.contract_date}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-foreground/60 font-medium">簽約款 (萬元)</label>
                        <input
                            name="contract_amount"
                            type="number"
                            step="0.1"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.contract_amount}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="p-3 bg-amber-500/5 rounded-xl border border-dashed border-amber-500/30 space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-600 uppercase">補差額 (天數)</label>
                            <input
                                name="sign_diff_date"
                                type="number"
                                step="1"
                                placeholder="找補天數 (例如: 3)"
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3.5 text-[11px] text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.sign_diff_date}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-600 uppercase">補差金額</label>
                            <input
                                name="sign_diff_amount"
                                type="number"
                                step="0.1"
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3.5 text-[11px] text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.sign_diff_amount}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Seal & Tax */}
                <div className="bg-secondary/30 p-5 rounded-2xl space-y-4 border border-border">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-blue-500">用印日</label>
                        <input
                            name="seal_date"
                            type="date"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.seal_date}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-foreground/60 font-medium">用印款 (萬元)</label>
                        <input
                            name="seal_amount"
                            type="number"
                            step="0.1"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.seal_amount}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="border-t border-border pt-2">
                        <div className="space-y-1 pt-2">
                            <label className="text-sm font-bold text-emerald-500">完稅日</label>
                            <input
                                name="tax_payment_date"
                                type="date"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.tax_payment_date}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-foreground/60 font-medium">完稅款 (萬元)</label>
                            <input
                                name="tax_amount"
                                type="number"
                                step="0.1"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.tax_amount}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Transfer & Note */}
                <div className="bg-secondary/30 p-5 rounded-2xl space-y-4 border border-border">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-purple-500">過戶日</label>
                        <input
                            name="transfer_date"
                            type="date"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.transfer_date}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-foreground/60 font-medium">過戶備註</label>
                        <input
                            name="transfer_note"
                            type="text"
                            placeholder="例如：代書辦理"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.transfer_note}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="border-t border-border pt-2">
                        <div className="space-y-1 pt-2">
                            <label className="text-sm font-bold text-orange-600">代償日</label>
                            <input
                                name="redemption_date"
                                type="date"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.redemption_date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Handover & Balance */}
                <div className="bg-primary/5 p-5 rounded-2xl space-y-4 border border-primary/20 ring-1 ring-primary/5">
                    <div className="space-y-1">
                        <label className="text-sm font-black text-red-500 uppercase tracking-tighter flex items-center gap-2">
                            交屋日{' '}
                            <span className="text-[10px] bg-red-500 text-white px-1.5 rounded-full">必填</span>
                        </label>
                        <input
                            name="handover_date"
                            type="date"
                            className="w-full bg-background border border-primary/30 rounded-xl px-4 py-4 min-h-[56px] text-foreground font-black focus:ring-2 focus:ring-red-500/20 transition-all"
                            required
                            value={formData.handover_date}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-foreground/60 font-bold">尾款金額 (萬元)</label>
                        <input
                            name="balance_amount"
                            type="number"
                            step="0.1"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.balance_amount}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
