'use client';

import React from 'react';
import {
    Calculator, RotateCcw, CheckCircle2
} from 'lucide-react';

import { useTaxCalculation } from './tax-calculator/useTaxCalculation';
import { TaxRentCalculatorProps } from './tax-calculator/types';

// Sections
import { DateAndSettingsSection } from './tax-calculator/sections/DateAndSettingsSection';
import { LandTaxSection } from './tax-calculator/sections/LandTaxSection';
import { HouseTaxSection } from './tax-calculator/sections/HouseTaxSection';
import { FeesSection } from './tax-calculator/sections/FeesSection';
import { UtilitiesSection } from './tax-calculator/sections/UtilitiesSection';
import { LeaseSection } from './tax-calculator/sections/LeaseSection';
import { ResultSection } from './tax-calculator/sections/ResultSection';

/**
 * 稅費分算計算機組件
 * 
 * 完整的不動產交易稅費分算計算器，支援：
 * - 地價稅/房屋稅分算（詳細模式 vs 快速模式）
 * - 管理費/車位費分算
 * - 租金與押金分算
 * - 水電瓦斯溢繳處理
 */
export default function TaxRentCalculator({ initialRegDate, initialHandoverDate }: TaxRentCalculatorProps) {
    const {
        regDate, setRegDate,
        handoverDate, setHandoverDate,
        handoverToBuyer, setHandoverToBuyer,

        landTaxMode, setLandTaxMode,
        lands, addLand, removeLand, updateLand,
        progStartValue, setProgStartValue,
        quickLandTax, setQuickLandTax,

        houseTaxMode, setHouseTaxMode,
        housePV, setHousePV,
        houseRateIdx, setHouseRateIdx,
        quickHouseTax, setQuickHouseTax,

        mgmtFee, setMgmtFee,
        mgmtPaidUntil, setMgmtPaidUntil,
        parkFee, setParkFee,
        parkPaidUntil, setParkPaidUntil,

        waterOverpay, setWaterOverpay,
        elecOverpay, setElecOverpay,
        gasOverpay, setGasOverpay,

        leases, addLease, removeLease, updateLease,

        otherBuyerPays, setOtherBuyerPays,
        otherSellerPays, setOtherSellerPays,

        handleClearAll,
        result,
    } = useTaxCalculation(initialRegDate, initialHandoverDate);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calculator className="w-6 h-6" />
                    稅費分算機
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                        title="清除所有輸入資料"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        清除重算
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Inputs */}
                <div className="lg:col-span-6 p-6 space-y-8 bg-slate-50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 h-[800px] overflow-y-auto custom-scrollbar">

                    <DateAndSettingsSection
                        regDate={regDate}
                        setRegDate={setRegDate}
                        handoverDate={handoverDate}
                        setHandoverDate={setHandoverDate}
                        handoverToBuyer={handoverToBuyer}
                        setHandoverToBuyer={setHandoverToBuyer}
                    />

                    <div className="divider" />

                    <LandTaxSection
                        landTaxMode={landTaxMode}
                        setLandTaxMode={setLandTaxMode}
                        lands={lands}
                        addLand={addLand}
                        removeLand={removeLand}
                        updateLand={updateLand}
                        progStartValue={progStartValue}
                        setProgStartValue={setProgStartValue}
                        quickLandTax={quickLandTax}
                        setQuickLandTax={setQuickLandTax}
                    />

                    <div className="divider" />

                    <HouseTaxSection
                        houseTaxMode={houseTaxMode}
                        setHouseTaxMode={setHouseTaxMode}
                        housePV={housePV}
                        setHousePV={setHousePV}
                        houseRateIdx={houseRateIdx}
                        setHouseRateIdx={setHouseRateIdx}
                        quickHouseTax={quickHouseTax}
                        setQuickHouseTax={setQuickHouseTax}
                    />

                    <div className="divider" />

                    <FeesSection
                        mgmtFee={mgmtFee}
                        setMgmtFee={setMgmtFee}
                        mgmtPaidUntil={mgmtPaidUntil}
                        setMgmtPaidUntil={setMgmtPaidUntil}
                        parkFee={parkFee}
                        setParkFee={setParkFee}
                        parkPaidUntil={parkPaidUntil}
                        setParkPaidUntil={setParkPaidUntil}
                    />

                    <div className="divider" />

                    <UtilitiesSection
                        waterOverpay={waterOverpay}
                        setWaterOverpay={setWaterOverpay}
                        elecOverpay={elecOverpay}
                        setElecOverpay={setElecOverpay}
                        gasOverpay={gasOverpay}
                        setGasOverpay={setGasOverpay}
                        otherBuyerPays={otherBuyerPays}
                        setOtherBuyerPays={setOtherBuyerPays}
                        otherSellerPays={otherSellerPays}
                        setOtherSellerPays={setOtherSellerPays}
                    />

                    <div className="divider" />

                    <LeaseSection
                        leases={leases}
                        addLease={addLease}
                        removeLease={removeLease}
                        updateLease={updateLease}
                    />

                </div>

                {/* Results */}
                <div className="lg:col-span-6 p-6 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-[800px] flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 分算結果 (Result)
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                        <ResultSection
                            result={result}
                            mgmtFee={mgmtFee}
                            parkFee={parkFee}
                            waterOverpay={waterOverpay}
                            elecOverpay={elecOverpay}
                            gasOverpay={gasOverpay}
                            leasesLength={leases.length}
                            otherBuyerPays={otherBuyerPays}
                            otherSellerPays={otherSellerPays}
                        />
                    </div>
                </div>
            </div>

            {/* Global Styles for Divider etc */}
            <style jsx>{`
                .section-title {
                    @apply flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300;
                }
                .divider {
                    @apply border-t border-slate-200 dark:border-slate-700/50;
                }
            `}</style>
        </div>
    );
}
