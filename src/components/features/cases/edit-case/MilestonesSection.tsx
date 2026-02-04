'use client';

import React from 'react';
import { toISODate } from './caseUtils';

interface MilestonesSectionProps {
    milestones: any;
    transferNote: string;
    setTransferNote: React.Dispatch<React.SetStateAction<string>>;
}

export const MilestonesSection: React.FC<MilestonesSectionProps> = ({
    milestones,
    transferNote,
    setTransferNote
}) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-amber-600 dark:!text-white border-l-4 border-amber-500 pl-3">進度日期</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-600 dark:!text-white">簽約日/款</label>
                    <input
                        name="contract_date"
                        defaultValue={toISODate(milestones?.contract_date)}
                        type="date"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        required
                    />
                    <input
                        name="contract_amount"
                        defaultValue={milestones?.contract_amount}
                        type="number"
                        step="0.1"
                        placeholder="金額"
                        className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-600">補差額/款</label>
                    <input
                        name="sign_diff_date"
                        defaultValue={toISODate(milestones?.sign_diff_date)}
                        type="date"
                        className="w-full bg-secondary/20 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                    <input
                        name="sign_diff_amount"
                        defaultValue={milestones?.sign_diff_amount}
                        type="number"
                        step="0.1"
                        placeholder="補差額"
                        className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-600">用印日/款</label>
                    <input
                        name="seal_date"
                        defaultValue={toISODate(milestones?.seal_date)}
                        type="date"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                    <input
                        name="seal_amount"
                        defaultValue={milestones?.seal_amount}
                        type="number"
                        step="0.1"
                        placeholder="金額"
                        className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-600">完稅日/款</label>
                    <input
                        name="tax_payment_date"
                        defaultValue={toISODate(milestones?.tax_payment_date)}
                        type="date"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                    <input
                        name="tax_amount"
                        defaultValue={milestones?.tax_amount}
                        type="number"
                        step="0.1"
                        placeholder="金額"
                        className="w-full bg-white/50 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground/40 flex justify-between">
                        <span>過戶日</span>
                        <span className="text-[9px] text-purple-500">備註</span>
                    </label>
                    <input
                        name="transfer_date"
                        defaultValue={toISODate(milestones?.transfer_date)}
                        type="date"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                    />
                    <div className="space-y-1">
                        <input
                            name="transfer_note"
                            value={transferNote}
                            onChange={(e) => setTransferNote(e.target.value)}
                            type="text"
                            placeholder="備註..."
                            className="w-full bg-secondary/20 border border-border-color rounded px-2 py-2 text-xs focus:bg-white/50 transition-all outline-none"
                        />
                        <div className="flex flex-wrap gap-1">
                            {['訴訟', '卡營業登記', '報拆延', '外案', '重要', '不重要'].map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setTransferNote((p) => (p ? `${p} ${tag}` : tag))}
                                    className="text-[10px] px-1.5 py-0.5 bg-purple-50 hover:bg-purple-500 hover:text-white text-purple-600 rounded border border-purple-100 transition-all"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-red-600">代償/交屋/尾款</label>
                    <input
                        name="redemption_date"
                        defaultValue={toISODate(milestones?.redemption_date)}
                        type="date"
                        className="w-full bg-secondary/20 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        title="代償日"
                    />
                    <input
                        name="handover_date"
                        defaultValue={toISODate(milestones?.handover_date)}
                        type="date"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-xs outline-none"
                        required
                        title="交屋日 (尾款日)"
                    />
                    <input
                        name="balance_amount"
                        defaultValue={milestones?.balance_amount}
                        type="number"
                        step="0.1"
                        placeholder="尾款金額"
                        className="w-full bg-white/50 border border-secondary-color rounded px-2 py-2 text-xs outline-none"
                    />
                </div>
            </div>
        </div>
    );
};
