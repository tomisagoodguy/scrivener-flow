import React from 'react';
import { Building2 } from 'lucide-react';
import { Label, Input } from '../TaxCalculatorComponents';
import { HOUSE_TAX_SCENARIOS } from '@/lib/calculatorUtils';

interface HouseTaxSectionProps {
    houseTaxMode: 'detailed' | 'quick';
    setHouseTaxMode: (mode: 'detailed' | 'quick') => void;
    housePV: string | number;
    setHousePV: (val: string | number) => void;
    houseRateIdx: number;
    setHouseRateIdx: (idx: number) => void;
    quickHouseTax: number;
    setQuickHouseTax: (val: number) => void;
}

export function HouseTaxSection({
    houseTaxMode,
    setHouseTaxMode,
    housePV,
    setHousePV,
    houseRateIdx,
    setHouseRateIdx,
    quickHouseTax,
    setQuickHouseTax
}: HouseTaxSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="section-title flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                    <Building2 className="w-4 h-4" /> 房屋稅 {houseTaxMode === 'detailed' ? '(現值稅率)' : '(快速試算)'}
                </h3>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-1 gap-1">
                    <button
                        onClick={() => setHouseTaxMode('detailed')}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${houseTaxMode === 'detailed' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                    >
                        詳細
                    </button>
                    <button
                        onClick={() => setHouseTaxMode('quick')}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${houseTaxMode === 'quick' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}
                    >
                        快速
                    </button>
                </div>
            </div>

            {houseTaxMode === 'detailed' ? (
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <Label>房屋現值</Label>
                        <Input
                            type="text"
                            value={housePV}
                            onChange={e => setHousePV(e.target.value)}
                            placeholder="1000000 或 1000000-100000"
                            title="支援減項格式，例如: 1000000-100000"
                        />
                        <div className="text-[9px] text-slate-500 mt-1">
                            可輸入減項格式 (例: 1000000-100000)
                        </div>
                    </div>
                    <div className="col-span-8">
                        <Label>使用情境 / 稅率</Label>
                        <select
                            className="w-full text-sm border border-slate-300 rounded p-2 bg-white"
                            value={houseRateIdx}
                            onChange={e => setHouseRateIdx(Number(e.target.value))}
                        >
                            {HOUSE_TAX_SCENARIOS.map((s, idx) => (
                                <option key={idx} value={idx}>{s.label} ({(s.rate * 100).toFixed(1)}%)</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <Label>房屋稅年度總額 (直接輸入)</Label>
                    <Input
                        type="number"
                        value={quickHouseTax || ''}
                        onChange={e => setQuickHouseTax(Number(e.target.value))}
                        placeholder="輸入稅單上的年度總繳納金額"
                        className="text-lg font-bold text-emerald-700 placeholder:text-emerald-300/50 block w-full"
                    />
                    <div className="text-[10px] text-emerald-600 mt-2">
                        此模式直接使用您輸入的金額進行天數分算。
                    </div>
                </div>
            )}
        </section>
    );
}
