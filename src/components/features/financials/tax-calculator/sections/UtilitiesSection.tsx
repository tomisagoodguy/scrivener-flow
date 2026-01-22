import React from 'react';
import { Droplets } from 'lucide-react';
import { Label, Input } from '../TaxCalculatorComponents';

interface UtilitiesSectionProps {
    waterOverpay: number;
    setWaterOverpay: (val: number) => void;
    elecOverpay: number;
    setElecOverpay: (val: number) => void;
    gasOverpay: number;
    setGasOverpay: (val: number) => void;
    otherBuyerPays: number;
    setOtherBuyerPays: (val: number) => void;
    otherSellerPays: number;
    setOtherSellerPays: (val: number) => void;
}

export function UtilitiesSection({
    waterOverpay,
    setWaterOverpay,
    elecOverpay,
    setElecOverpay,
    gasOverpay,
    setGasOverpay,
    otherBuyerPays,
    setOtherBuyerPays,
    otherSellerPays,
    setOtherSellerPays
}: UtilitiesSectionProps) {
    return (
        <section className="space-y-4">
            <h3 className="section-title flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <Droplets className="w-4 h-4" /> 水電瓦斯溢繳 (賣方預繳)
            </h3>
            <div className="flex gap-2">
                <div className="flex-1"><Label>水費</Label><Input type="number" value={waterOverpay} onChange={e => setWaterOverpay(Number(e.target.value))} /></div>
                <div className="flex-1"><Label>電費</Label><Input type="number" value={elecOverpay} onChange={e => setElecOverpay(Number(e.target.value))} /></div>
                <div className="flex-1"><Label>瓦斯</Label><Input type="number" value={gasOverpay} onChange={e => setGasOverpay(Number(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div><Label>其他 (買方補賣方)</Label><Input type="number" value={otherBuyerPays} onChange={e => setOtherBuyerPays(Number(e.target.value))} /></div>
                <div><Label>其他 (賣方補買方)</Label><Input type="number" value={otherSellerPays} onChange={e => setOtherSellerPays(Number(e.target.value))} /></div>
            </div>
        </section>
    );
}
