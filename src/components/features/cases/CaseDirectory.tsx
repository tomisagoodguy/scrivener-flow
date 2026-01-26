'use client';

import React from 'react';
import { DemoCase } from '@/types';
import { cn } from '@/lib/utils';
import { Users, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface CaseDirectoryProps {
    cases: DemoCase[];
}

export default function CaseDirectory({ cases }: CaseDirectoryProps) {
    const params = useParams();
    const activeId = params?.id as string;
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll active item into view
    React.useEffect(() => {
        if (activeId && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-active="true"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [activeId]);

    return (
        <aside className="sticky top-[80px] h-[calc(100vh-100px)] w-[180px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 z-20 hidden xl:flex flex-col shadow-lg rounded-xl transition-all duration-300">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className="bg-blue-600/10 dark:bg-blue-500/20 p-1 rounded-md">
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs">案件目錄</h3>
                </div>
                <p className="text-[9px] text-slate-500 font-medium pl-1">共 {cases.length} 筆案件</p>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar group/list"
            >
                <div className="px-2 space-y-1">
                    {cases.map((caseData) => (
                        <Link
                            key={caseData.id}
                            href={`/cases/${caseData.id}`}
                            data-active={activeId === caseData.id}
                            className={cn(
                                "flex items-center justify-between p-2 rounded-lg text-xs transition-all duration-200 group/item border border-transparent",
                                activeId === caseData.id
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <div className="flex flex-col gap-0.5 truncate w-full">
                                <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        caseData.status === 'Closed' ? "bg-slate-300" : "bg-emerald-500"
                                    )} />
                                    <span className="font-bold truncate">{caseData.buyer_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 pl-3 text-[10px] opacity-70">
                                    <span className="truncate">/ {caseData.seller_name}</span>
                                </div>
                            </div>

                            {activeId === caseData.id && (
                                <ChevronRight className="w-3 h-3 shrink-0 text-blue-500 animate-in fade-in slide-in-from-left-1" />
                            )}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="p-3 text-[10px] text-center text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                快速導航
            </div>
        </aside>
    );
}
