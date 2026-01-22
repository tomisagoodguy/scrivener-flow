import React from 'react';
import { CaseFormData } from './types';

interface InvolvedPartiesSectionProps {
    formData: CaseFormData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function InvolvedPartiesSection({ formData, handleChange }: InvolvedPartiesSectionProps) {
    return (
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
                            value={formData.buyer_name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-foreground/50">電話</label>
                        <input
                            name="buyer_phone"
                            type="text"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium"
                            value={formData.buyer_phone}
                            onChange={handleChange}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                    <div className="space-y-1">
                        <label className="text-[10px] text-foreground/40 uppercase font-bold">
                            登記名義人
                        </label>
                        <input
                            name="registrant_name"
                            type="text"
                            className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-bold"
                            placeholder="同買方"
                            value={formData.registrant_name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-foreground/40 uppercase font-bold">
                            登記人電話
                        </label>
                        <input
                            name="registrant_phone"
                            type="text"
                            className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-medium"
                            value={formData.registrant_phone}
                            onChange={handleChange}
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
                            value={formData.seller_name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-foreground/50">電話</label>
                        <input
                            name="seller_phone"
                            type="text"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium"
                            value={formData.seller_phone}
                            onChange={handleChange}
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
                            value={formData.agent_name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-foreground/40 uppercase font-bold">
                            代理人電話
                        </label>
                        <input
                            name="agent_phone"
                            type="text"
                            className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-medium"
                            value={formData.agent_phone}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
