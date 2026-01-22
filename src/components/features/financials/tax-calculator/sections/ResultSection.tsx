import React from 'react';
import {
    CheckCircle2, Home, Building2, Car, Zap, Sprout, ArrowRightLeft
} from 'lucide-react';
import { ResultItem } from '../TaxCalculatorComponents';
import { money } from '@/lib/calculatorUtils';
import { TaxCalculationResult } from '../types';

interface ResultSectionProps {
    result: TaxCalculationResult | null;
    mgmtFee: number;
    parkFee: number;
    waterOverpay: number;
    elecOverpay: number;
    gasOverpay: number;
    leasesLength: number;
    otherBuyerPays: number;
    otherSellerPays: number;
}

export function ResultSection({
    result,
    mgmtFee,
    parkFee,
    waterOverpay,
    elecOverpay,
    gasOverpay,
    leasesLength,
    otherBuyerPays,
    otherSellerPays
}: ResultSectionProps) {
    if (!result) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50">
                <ArrowRightLeft className="w-16 h-16 mb-4" />
                <p>請輸入登記日與交屋日以開始計算</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ResultItem title="地價稅" res={result.land} icon={<Home size={16} />} />
            <ResultItem title="房屋稅" res={result.house} icon={<Building2 size={16} />} />
            {(mgmtFee > 0 || parkFee > 0) && (
                <>
                    {mgmtFee > 0 && <ResultItem title="管理費" res={result.mgmt} />}
                    {parkFee > 0 && <ResultItem title="車位費" res={result.park} icon={<Car size={16} />} />}
                </>
            )}
            {(waterOverpay > 0 || elecOverpay > 0 || gasOverpay > 0) && <ResultItem title="水電瓦斯溢繳" res={result.util} icon={<Zap size={16} />} />}
            {leasesLength > 0 && <ResultItem title="租金與押金" res={result.rent} icon={<Sprout size={16} />} />}
            {(otherBuyerPays > 0 || otherSellerPays > 0) && (
                <div className="p-3 bg-slate-50 border rounded flex justify-between">
                    <div className="font-bold text-slate-700">其他費用</div>
                    <div className="text-right text-xs">
                        {otherBuyerPays > 0 && <div className="text-blue-600">+${money(otherBuyerPays)} (買補賣)</div>}
                        {otherSellerPays > 0 && <div className="text-pink-600">+${money(otherSellerPays)} (賣補買)</div>}
                    </div>
                </div>
            )}

            {/* Final Sum */}
            <div className="mt-8 pt-6 border-t font-mono">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-right p-3 bg-blue-50 rounded">
                        <div className="text-xs text-blue-500 mb-1">買方給賣方 (Credits)</div>
                        <div className="text-xl font-black text-blue-600">${money(result.totals.buyerPays)}</div>
                    </div>
                    <div className="text-right p-3 bg-pink-50 rounded">
                        <div className="text-xs text-pink-500 mb-1">賣方給買方 (Debits)</div>
                        <div className="text-xl font-black text-pink-600">${money(result.totals.sellerPays)}</div>
                    </div>
                </div>

                <div className={`p-6 rounded-xl text-center border-2 shadow-lg transform transition-all hover:scale-105 ${result.totals.net >= 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-pink-600 border-pink-700 text-white'}`}>
                    <div className="text-xs font-bold opacity-80 mb-2 uppercase tracking-widest">最終結算 (Net Settlement)</div>
                    <div className="text-3xl font-black">
                        {result.totals.net >= 0
                            ? `買方補貼賣方 $${money(result.totals.net)}`
                            : `賣方補貼買方 $${money(Math.abs(result.totals.net))}`
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
