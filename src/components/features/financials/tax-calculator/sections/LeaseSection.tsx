import React from 'react';
import { Sprout, Trash2, Plus } from 'lucide-react';
import { Label, Input } from '../TaxCalculatorComponents';
import { LeaseItem } from '../types'; // Adjust path if needed

interface LeaseSectionProps {
    leases: LeaseItem[];
    addLease: () => void;
    removeLease: (id: string) => void;
    updateLease: (id: string, field: keyof LeaseItem, value: any) => void;
}

export function LeaseSection({
    leases,
    addLease,
    removeLease,
    updateLease
}: LeaseSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="section-title flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                    <Sprout className="w-4 h-4" /> 租約分算
                </h3>
                <button onClick={addLease} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                    <Plus size={12} /> 新增
                </button>
            </div>
            {leases.map(lease => (
                <div key={lease.id} className="p-3 border rounded bg-orange-50/50 relative">
                    <button onClick={() => removeLease(lease.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="col-span-1"><Label>租客</Label><Input value={lease.tenantName} onChange={e => updateLease(lease.id, 'tenantName', e.target.value)} /></div>
                        <div className="col-span-1"><Label>月租</Label><Input type="number" value={lease.monthlyRent} onChange={e => updateLease(lease.id, 'monthlyRent', Number(e.target.value))} /></div>
                        <div className="col-span-1"><Label>押金</Label><Input type="number" value={lease.deposit} onChange={e => updateLease(lease.id, 'deposit', Number(e.target.value))} /></div>
                    </div>
                    <div><Label>租金已繳至</Label><Input type="date" value={lease.paidUntil} onChange={e => updateLease(lease.id, 'paidUntil', e.target.value)} /></div>
                </div>
            ))}
        </section>
    );
}
