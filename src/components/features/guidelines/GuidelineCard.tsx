'use client';

import React from 'react';
import { Scale, Clock, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { RealEstateGuideline } from '@/data/real_estate_guidelines';

interface GuidelineCardProps {
    item: RealEstateGuideline;
}

export function GuidelineCard({ item }: GuidelineCardProps) {
    // Generate a deterministic hash for the ID based on content to ensure hydration match
    const seed = item.role + item.scenario;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const scenarioId = `SC-${Math.abs(hash).toString().substring(0, 6)}`;

    return (
        <div className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent opacity-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${item.role === '買方' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                item.role === '賣方' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    'bg-purple-50 text-purple-600 border-purple-100'
                                }`}>
                                {item.role}
                            </span>
                            <span className="text-slate-400 text-xs font-mono">
                                #{scenarioId}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                            {item.scenario}
                            <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    <div className="space-y-4">
                        {item.legal_info && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-colors">
                                <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
                                    <Scale className="w-4 h-4 text-blue-500" />
                                    法規須知
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.legal_info}</p>
                            </div>
                        )}

                        {item.special_clauses && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2 text-amber-900 font-bold mb-2">
                                    <FileText className="w-4 h-4 text-amber-600" />
                                    特約條款參考
                                </div>
                                <code className="text-xs text-amber-800 bg-white/50 px-2 py-1 rounded block mt-1 font-mono whitespace-pre-line">
                                    {item.special_clauses}
                                </code>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {item.required_docs && (
                            <div className="flex gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg h-fit text-indigo-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 mb-1">應備文件</h4>
                                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                        {item.required_docs}
                                    </div>
                                </div>
                            </div>
                        )}

                        {item.processing_time && (
                            <div className="flex gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg h-fit text-emerald-600">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 mb-1">作業時間</h4>
                                    <p className="text-sm text-slate-600">{item.processing_time}</p>
                                </div>
                            </div>
                        )}

                        {item.caution && (
                            <div className="flex gap-3">
                                <div className="p-2 bg-rose-50 rounded-lg h-fit text-rose-600">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 mb-1">特別注意</h4>
                                    <p className="text-sm text-slate-600">{item.caution}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
