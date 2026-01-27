import React from 'react';
import { Phone, Clock, Globe, FileText } from 'lucide-react';
import { RedemptionInfo } from './types';

interface RedemptionCardProps {
    item: RedemptionInfo;
    setCurrentData: (data: Partial<RedemptionInfo>) => void;
    setIsEditing: (val: boolean) => void;
    handleDelete?: (id: string) => void; // Optional if we move delete here or keep in modal
}

export function RedemptionCard({ item, setCurrentData, setIsEditing }: RedemptionCardProps) {
    return (
        <div className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {item.bank_name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">{item.bank_name}</h3>
                </div>
                <button
                    onClick={() => {
                        setCurrentData(item);
                        setIsEditing(true);
                    }}
                    className="text-slate-300 hover:text-indigo-600 transition-colors"
                >
                    <FileText className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-4 flex-1">
                {item.service_phone && (
                    <div className="flex gap-3 items-start">
                        <Phone className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                        <div className="text-sm">
                            <div className="text-slate-500 text-xs mb-0.5">服務電話</div>
                            <div className="font-medium text-slate-700">{item.service_phone}</div>
                        </div>
                    </div>
                )}

                {item.lead_time && (
                    <div className="flex gap-3 items-start">
                        <Clock className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                        <div className="text-sm">
                            <div className="text-slate-500 text-xs mb-0.5">作業天數</div>
                            <div className="font-medium text-slate-700">{item.lead_time}</div>
                        </div>
                    </div>
                )}

                {item.account_info && (
                    <div className="flex gap-3 items-start">
                        <Globe className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                        <div className="text-sm">
                            <div className="text-slate-500 text-xs mb-0.5">匯款/帳號資訊</div>
                            <div className="font-medium text-slate-700 whitespace-pre-line">{item.account_info}</div>
                        </div>
                    </div>
                )}

                {item.notes && (
                    <div className="mt-4 pt-4 border-t border-slate-100 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
