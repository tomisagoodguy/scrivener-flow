'use client';

import React from 'react';
import { toISODatetime } from './caseUtils';

interface AppointmentsSectionProps {
    milestones: any;
}

export const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({ milestones }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-indigo-600 border-l-4 border-indigo-500 pl-3">
                與客戶約定時間 (Appointments)
            </h3>
            <p className="text-xs text-foreground/50">
                請設定與客戶見面的具體時間 (精確到分)，系統將於前 3 天提醒。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-600">用印約定</label>
                    <input
                        name="seal_appointment"
                        defaultValue={toISODatetime(milestones?.seal_appointment)}
                        type="datetime-local"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-300 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-600">完稅約定</label>
                    <input
                        name="tax_appointment"
                        defaultValue={toISODatetime(milestones?.tax_appointment)}
                        type="datetime-local"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-300 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-600">交屋約定</label>
                    <input
                        name="handover_appointment"
                        defaultValue={toISODatetime(milestones?.handover_appointment)}
                        type="datetime-local"
                        className="w-full bg-secondary/30 border border-border-color rounded px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-300 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};
