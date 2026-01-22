import React from 'react';
import { Calendar } from 'lucide-react';
import { InputGroup, TabButton } from '../TaxCalculatorComponents';

interface DateAndSettingsSectionProps {
    regDate: string;
    setRegDate: (val: string) => void;
    handoverDate: string;
    setHandoverDate: (val: string) => void;
    handoverToBuyer: boolean;
    setHandoverToBuyer: (val: boolean) => void;
}

export function DateAndSettingsSection({
    regDate,
    setRegDate,
    handoverDate,
    setHandoverDate,
    handoverToBuyer,
    setHandoverToBuyer
}: DateAndSettingsSectionProps) {
    return (
        <section className="space-y-4">
            <h3 className="section-title flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4" /> 關鍵日期
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="登記(過戶)日" type="date" value={regDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegDate(e.target.value)} />
                <InputGroup label="交屋(分算)日" type="date" value={handoverDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHandoverDate(e.target.value)} />
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-400">交屋日歸屬</span>
                <div className="flex gap-1">
                    <TabButton active={handoverToBuyer} onClick={() => setHandoverToBuyer(true)} label="歸買方" color="blue" />
                    <TabButton active={!handoverToBuyer} onClick={() => setHandoverToBuyer(false)} label="歸賣方" color="pink" />
                </div>
            </div>
        </section>
    );
}
