'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color: string;
}

export function MetricCard({ icon, label, value, sub, color }: MetricCardProps) {
    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
                <div className={`flex items-center gap-2 mb-2 ${color}`}>
                    {icon}
                    <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
                {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
            </CardContent>
        </Card>
    );
}
