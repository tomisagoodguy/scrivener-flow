'use client';

import React from 'react';
import { DemoCase } from '@/types';

interface AuditLogSectionProps {
    initialData: DemoCase;
}

export const AuditLogSection: React.FC<AuditLogSectionProps> = ({ initialData }) => {
    const logs = (initialData as any).case_date_logs || [];

    if (logs.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-500 border-l-4 border-gray-400 pl-3">
                日期更動紀錄 (Change Log)
            </h3>
            <div className="bg-secondary/20 rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                {logs.map((log: any) => (
                    <div key={log.id} className="text-xs text-foreground/70 border-b border-border/50 pb-1">
                        <span className="font-bold text-primary">{log.field_name}</span>:
                        <span className="line-through mx-2 text-red-400">{log.old_value || '(空)'}</span>➔
                        <span className="font-bold text-green-600 mx-2">{log.new_value}</span>
                        <span className="text-[10px] text-gray-400">
                            ({new Date(log.changed_at).toLocaleString('zh-TW')})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
