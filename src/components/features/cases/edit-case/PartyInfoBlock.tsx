import React from 'react';
import { DemoCase } from '@/types';

interface PartyInfoBlockProps {
    initialData: DemoCase;
}

export function PartyInfoBlock({ initialData }: PartyInfoBlockProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Buyer Side */}
            <div className="bg-secondary/30 p-4 rounded-xl space-y-3 border border-border">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> 買方
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-sm text-foreground/50">姓名</label>
                        <input
                            name="buyer_name"
                            type="text"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold"
                            required
                            defaultValue={initialData.buyer_name}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-foreground/50">電話</label>
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
                        <label className="text-xs text-foreground/40 uppercase font-bold">登記名義人</label>
                        <input
                            name="registrant_name"
                            type="text"
                            className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-bold"
                            placeholder="同買方"
                            defaultValue={initialData.registrant_name}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-foreground/40 uppercase font-bold">登記人電話</label>
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
                        <label className="text-sm text-foreground/50">姓名</label>
                        <input
                            name="seller_name"
                            type="text"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold"
                            required
                            defaultValue={initialData.seller_name}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-foreground/50">電話</label>
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
                        <label className="text-xs text-foreground/40 uppercase font-bold">代理人</label>
                        <input
                            name="agent_name"
                            type="text"
                            className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-xs font-bold"
                            defaultValue={initialData.agent_name}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-foreground/40 uppercase font-bold">代理人電話</label>
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
    );
}
