'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toISODate } from './caseUtils';
import { DemoCase } from '@/types';

interface TaxDeadlinesSectionProps {
    initialData: DemoCase;
    financials: any;
}

export const TaxDeadlinesSection: React.FC<TaxDeadlinesSectionProps> = ({ initialData, financials }) => {
    const todos = (initialData as any).todos || [];

    const isCompleted = (key: string) => {
        return todos.find((t: any) => t.source_key === key)?.is_completed;
    };

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-bold text-rose-600 dark:text-white! border-l-4 border-rose-500 pl-3">
                稅單限繳日期 (Tax Deadlines)
            </h3>
            <p className="text-xs text-foreground/50">設定限繳日後，系統將於前 5 天開始提醒。</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-bold text-rose-600">土增稅限繳日 (常用)</label>
                        {isCompleted('land_value_tax_deadline') && (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                    </div>
                    <input
                        name="land_value_tax_deadline"
                        defaultValue={toISODate(financials?.land_value_tax_deadline)}
                        type="date"
                        className="w-full bg-rose-50/50 border border-rose-200 rounded px-2 py-2 text-sm focus:ring-1 focus:ring-rose-300 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-bold text-rose-600">契稅限繳日 (常用)</label>
                        {isCompleted('deed_tax_deadline') && (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                    </div>
                    <input
                        name="deed_tax_deadline"
                        defaultValue={toISODate(financials?.deed_tax_deadline)}
                        type="date"
                        className="w-full bg-rose-50/50 border border-rose-200 rounded px-2 py-2 text-sm focus:ring-1 focus:ring-rose-300 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-bold text-gray-500">地價稅限繳日</label>
                        {isCompleted('land_tax_deadline') && (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                    </div>
                    <input
                        name="land_tax_deadline"
                        defaultValue={toISODate(financials?.land_tax_deadline)}
                        type="date"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-gray-300 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-bold text-gray-500">房屋稅限繳日</label>
                        {isCompleted('house_tax_deadline') && (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                    </div>
                    <input
                        name="house_tax_deadline"
                        defaultValue={toISODate(financials?.house_tax_deadline)}
                        type="date"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-gray-300 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};
