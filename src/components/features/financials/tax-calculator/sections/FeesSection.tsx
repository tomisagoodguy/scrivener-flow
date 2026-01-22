import React from 'react';
import { DollarSign } from 'lucide-react';
import { Label, Input } from '../TaxCalculatorComponents';

interface FeesSectionProps {
    mgmtFee: number;
    setMgmtFee: (val: number) => void;
    mgmtPaidUntil: string;
    setMgmtPaidUntil: (val: string) => void;
    parkFee: number;
    setParkFee: (val: number) => void;
    parkPaidUntil: string;
    setParkPaidUntil: (val: string) => void;
}

export function FeesSection({
    mgmtFee,
    setMgmtFee,
    mgmtPaidUntil,
    setMgmtPaidUntil,
    parkFee,
    setParkFee,
    parkPaidUntil,
    setParkPaidUntil,
}: FeesSectionProps) {
    return (
        <section className="space-y-4">
            <h3 className="section-title flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <DollarSign className="w-4 h-4" /> 管理費 / 車位費
            </h3>
            <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-1">
                        <Label>管理費/月</Label>
                        <Input type="number" value={mgmtFee} onChange={e => setMgmtFee(Number(e.target.value))} />
                    </div>
                    <div className="col-span-8 space-y-1">
                        <Label>已繳至</Label>
                        <Input type="date" value={mgmtPaidUntil} onChange={e => setMgmtPaidUntil(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-1">
                        <Label>車位費/月</Label>
                        <Input type="number" value={parkFee} onChange={e => setParkFee(Number(e.target.value))} />
                    </div>
                    <div className="col-span-8 space-y-1">
                        <Label>已繳至</Label>
                        <Input type="date" value={parkPaidUntil} onChange={e => setParkPaidUntil(e.target.value)} />
                    </div>
                </div>
            </div>
        </section>
    );
}
