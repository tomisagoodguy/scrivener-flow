import React from 'react';
import { Home, Trash2, Plus } from 'lucide-react';
import { Label, Input } from '../TaxCalculatorComponents';
import { LandItem } from '@/lib/calculatorUtils';

interface LandTaxSectionProps {
    landTaxMode: 'detailed' | 'quick';
    setLandTaxMode: (mode: 'detailed' | 'quick') => void;
    lands: LandItem[];
    addLand: () => void;
    removeLand: (id: string) => void;
    updateLand: (id: string, field: keyof LandItem, value: any) => void;
    progStartValue: number;
    setProgStartValue: (val: number) => void;
    quickLandTax: number;
    setQuickLandTax: (val: number) => void;
}

export function LandTaxSection({
    landTaxMode,
    setLandTaxMode,
    lands,
    addLand,
    removeLand,
    updateLand,
    progStartValue,
    setProgStartValue,
    quickLandTax,
    setQuickLandTax
}: LandTaxSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="section-title flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                    <Home className="w-4 h-4" /> 地價稅 {landTaxMode === 'detailed' ? '(多筆累進)' : '(快速試算)'}
                </h3>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-1 gap-1">
                    <button
                        onClick={() => setLandTaxMode('detailed')}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${landTaxMode === 'detailed' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                    >
                        詳細
                    </button>
                    <button
                        onClick={() => setLandTaxMode('quick')}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${landTaxMode === 'quick' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}
                    >
                        快速
                    </button>
                </div>
            </div>

            {landTaxMode === 'detailed' ? (
                <>
                    <div className="space-y-2">
                        {lands.map((l, i) => (
                            <div key={l.id} className="p-3 bg-white border rounded relative group shadow-sm">
                                <button onClick={() => removeLand(l.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-3"><Label>地號</Label><Input value={l.lotNo} onChange={e => updateLand(l.id, 'lotNo', e.target.value)} placeholder="001" /></div>
                                    <div className="col-span-3"><Label>地價/m²</Label><Input type="number" value={l.value} onChange={e => updateLand(l.id, 'value', Number(e.target.value))} /></div>
                                    <div className="col-span-2"><Label>面積</Label><Input type="number" value={l.area} onChange={e => updateLand(l.id, 'area', Number(e.target.value))} /></div>
                                    <div className="col-span-2"><Label>持分</Label><Input type="number" value={l.scope} onChange={e => updateLand(l.id, 'scope', Number(e.target.value))} placeholder="1" /></div>
                                    <div className="col-span-2">
                                        <Label>類型</Label>
                                        <select
                                            className="w-full text-xs border rounded p-1"
                                            value={l.landType}
                                            onChange={e => updateLand(l.id, 'landType', e.target.value)}
                                        >
                                            <option>自用住宅 (2‰)</option>
                                            <option>一般用地 (10‰)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">累進起點</span>
                            <input type="number" className="w-20 text-right text-xs border rounded px-1" value={progStartValue} onChange={e => setProgStartValue(Number(e.target.value))} title="預設 1,700,000" />
                        </div>
                        <button onClick={addLand} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                            <Plus size={12} /> 新增土地
                        </button>
                    </div>
                </>
            ) : (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <Label>地價稅年度總額 (直接輸入)</Label>
                    <Input
                        type="number"
                        value={quickLandTax || ''}
                        onChange={e => setQuickLandTax(Number(e.target.value))}
                        placeholder="輸入稅單上的年度總繳納金額"
                        className="text-lg font-bold text-emerald-700 placeholder:text-emerald-300/50 block w-full"
                    />
                    <div className="text-[10px] text-emerald-600 mt-2">
                        此模式直接使用您輸入的金額進行天數分算，不進行地價累進計算。
                    </div>
                </div>
            )}
        </section>
    );
}
