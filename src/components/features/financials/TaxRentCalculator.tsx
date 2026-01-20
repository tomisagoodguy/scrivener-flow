'use client';

import React, { useState, useEffect } from 'react';
import {
    Calculator, Calendar, DollarSign, ArrowRightLeft,
    CheckCircle2, AlertCircle, Building2, Car, Home,
    Plus, Trash2, RotateCcw, Droplets, Zap, Flame, Sprout
} from 'lucide-react';
import {
    calculateLandTaxProration,
    calculateHouseTaxProration,
    calculateFeeProration,
    calculateRentProration,
    calculateAnnualLandTax,
    HOUSE_TAX_SCENARIOS,
    LandItem,
    money
} from '@/lib/calculatorUtils';

// Define Lease Interface (Already in utils but usually local usage is fine or import)
interface LeaseItem {
    id: string;
    tenantName: string;
    monthlyRent: number;
    deposit: number;
    paidUntil: string;
}

interface TaxRentCalculatorProps {
    initialRegDate?: string;
    initialHandoverDate?: string;
}

/**
 * 稅費分算計算機組件
 * 
 * 完整的不動產交易稅費分算計算器，支援：
 * - 地價稅/房屋稅分算（詳細模式 vs 快速模式）
 * - 管理費/車位費分算
 * - 租金與押金分算
 * - 水電瓦斯溢繳處理
 * 
 * @param initialRegDate - 初始登記日期（選填）
 * @param initialHandoverDate - 初始交屋日期（選填）
 */
export default function TaxRentCalculator({ initialRegDate, initialHandoverDate }: TaxRentCalculatorProps) {
    // --- State ---
    const [regDate, setRegDate] = useState<string>(initialRegDate || '');
    const [handoverDate, setHandoverDate] = useState<string>(initialHandoverDate || '');
    const [handoverToBuyer, setHandoverToBuyer] = useState<boolean>(true);

    // Land Tax Inputs
    // Land Tax Inputs
    const [landTaxMode, setLandTaxMode] = useState<'detailed' | 'quick'>('quick');
    const [lands, setLands] = useState<LandItem[]>([]);
    const [progStartValue, setProgStartValue] = useState<number>(1700000); // 累進起點地價
    const [quickLandTax, setQuickLandTax] = useState<number>(0); // Manual Input

    // House Tax Inputs
    const [houseTaxMode, setHouseTaxMode] = useState<'detailed' | 'quick'>('quick');
    const [housePV, setHousePV] = useState<string | number>(0); // 現值（支援減項格式，例如 "1000000-100000"）
    const [houseRateIdx, setHouseRateIdx] = useState<number>(1); // Index in SCENARIOS (Default: 自住用-全國3戶內)
    const [quickHouseTax, setQuickHouseTax] = useState<number>(0); // Manual Input

    // Monthly Fees
    const [mgmtFee, setMgmtFee] = useState<number>(0);
    const [mgmtPaidUntil, setMgmtPaidUntil] = useState<string>('');
    const [parkFee, setParkFee] = useState<number>(0);
    const [parkPaidUntil, setParkPaidUntil] = useState<string>('');

    // Utilities (Overpayment - Buyer Pays Seller)
    const [waterOverpay, setWaterOverpay] = useState<number>(0);
    const [elecOverpay, setElecOverpay] = useState<number>(0);
    const [gasOverpay, setGasOverpay] = useState<number>(0);

    // Leases (Multiple)
    const [leases, setLeases] = useState<LeaseItem[]>([]);

    // Other Adjustments
    const [otherBuyerPays, setOtherBuyerPays] = useState<number>(0);
    const [otherSellerPays, setOtherSellerPays] = useState<number>(0);

    // Results
    const [result, setResult] = useState<any>(null);

    // --- Helpers: Land ---
    const addLand = () => {
        setLands([
            ...lands,
            { id: crypto.randomUUID(), lotNo: '', value: 0, area: 0, scope: 1, landType: '自用住宅 (2‰)' }
        ]);
    };
    const removeLand = (id: string) => setLands(lands.filter(l => l.id !== id));
    const updateLand = (id: string, field: keyof LandItem, value: any) => {
        setLands(lands.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    // --- Helpers: Lease ---
    const addLease = () => {
        setLeases([
            ...leases,
            { id: crypto.randomUUID(), tenantName: '', monthlyRent: 0, deposit: 0, paidUntil: '' }
        ]);
    };
    const removeLease = (id: string) => setLeases(leases.filter(l => l.id !== id));
    const updateLease = (id: string, field: keyof LeaseItem, value: any) => {
        setLeases(leases.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    // HELPER: Clear All
    const handleClearAll = () => {
        if (!confirm('確定要清除所有資料嗎？')) return;
        setRegDate('');
        setHandoverDate('');
        setHandoverToBuyer(true);
        setLandTaxMode('quick');
        setLands([]);
        setQuickLandTax(0);
        setHouseTaxMode('quick');
        setHousePV(0);
        setHouseRateIdx(1);
        setQuickHouseTax(0);
        setMgmtFee(0);
        setMgmtPaidUntil('');
        setParkFee(0);
        setParkPaidUntil('');
        setWaterOverpay(0);
        setElecOverpay(0);
        setGasOverpay(0);
        setLeases([]);
        setOtherBuyerPays(0);
        setOtherSellerPays(0);
        setResult(null);
    };

    // --- Calculation Effect ---
    useEffect(() => {
        if (!regDate || !handoverDate) {
            setResult(null);
            return;
        }

        const rDate = new Date(regDate);
        const hDate = new Date(handoverDate);

        // 1. Calculate Annual Taxes
        // Land
        let annualLandTax = 0;
        let landDetail = '';
        if (landTaxMode === 'detailed') {
            const res = calculateAnnualLandTax(lands, progStartValue);
            annualLandTax = res.totalTax;
            landDetail = res.detail;
        } else {
            annualLandTax = quickLandTax;
            landDetail = `手動輸入年稅額 (快速模式)`;
        }

        // House
        let annualHouseTax = 0;
        let houseDetail = '';
        // Safe check for houseRateIdx validity
        const scenario = HOUSE_TAX_SCENARIOS[houseRateIdx] || HOUSE_TAX_SCENARIOS[1];
        const houseRate = scenario?.rate || 0.012;

        // 解析房屋現值（支援減項格式，例如 "1000000-100000"）
        let parsedHousePV = 0;
        if (typeof housePV === 'string' && housePV.includes('-')) {
            // 減項格式處理
            const parts = housePV.split('-').map(p => parseFloat(p.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                parsedHousePV = parts[0] - parts[1];
                houseDetail = `房屋現值: (${money(parts[0])} - ${money(parts[1])}) = $${money(parsedHousePV)}\n`;
            }
        } else {
            parsedHousePV = typeof housePV === 'number' ? housePV : parseFloat(housePV) || 0;
        }

        if (houseTaxMode === 'detailed') {
            annualHouseTax = Math.round(parsedHousePV * houseRate);
            if (!houseDetail) {
                houseDetail = `現值 $${money(parsedHousePV)} × 稅率 ${(houseRate * 100).toFixed(1)}% (${scenario?.label})\n= 年稅額 $${money(annualHouseTax)}`;
            } else {
                houseDetail += `$${money(parsedHousePV)} × 稅率 ${(houseRate * 100).toFixed(1)}% (${scenario?.label})\n= 年稅額 $${money(annualHouseTax)}`;
            }
        } else {
            annualHouseTax = quickHouseTax;
            houseDetail = `手動輸入年稅額 (快速模式)`;
        }

        // 2. Prorate Taxes
        const landRes = calculateLandTaxProration(annualLandTax, hDate, rDate, handoverToBuyer);
        // Prepend logic detail to breakdown
        landRes.breakdown = `【地價稅年繳額計算】\n${landDetail}\n= 年稅額 $${money(annualLandTax)}\n\n` + landRes.breakdown;

        const houseRes = calculateHouseTaxProration(annualHouseTax, hDate, rDate, handoverToBuyer);
        houseRes.breakdown = `【房屋稅年繳額計算】\n${houseDetail}\n= 年稅額 $${money(annualHouseTax)}\n\n` + houseRes.breakdown;

        // 3. Fees
        let mgmtRes = { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '' };
        if (mgmtFee > 0 && mgmtPaidUntil) {
            mgmtRes = calculateFeeProration(mgmtFee, new Date(mgmtPaidUntil), hDate, handoverToBuyer);
        }

        let parkRes = { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '' };
        if (parkFee > 0 && parkPaidUntil) {
            parkRes = calculateFeeProration(parkFee, new Date(parkPaidUntil), hDate, handoverToBuyer);
        }

        // 4. Utilities (Overpayment) -> Buyer Pays Seller
        // User Logic: "Only Overpayment because seller lives there" -> Seller paid -> Buyer refunds Seller
        const utilTotal = waterOverpay + elecOverpay + gasOverpay;
        const utilRes = {
            buyerPaysSeller: utilTotal,
            sellerPaysBuyer: 0,
            breakdown: utilTotal > 0
                ? `水費 $${money(waterOverpay)} + 電費 $${money(elecOverpay)} + 瓦斯 $${money(gasOverpay)} = $${money(utilTotal)}\n(賣方溢繳/預繳，由買方歸還)`
                : '無溢繳金額'
        };

        // 5. Leases (Multiple)
        let rentBuyerPays = 0;
        let rentSellerPays = 0;
        let rentBreakdown = '';
        let depositTransfer = 0;

        leases.forEach((lease, index) => {
            if (lease.monthlyRent > 0 && lease.paidUntil) {
                const res = calculateRentProration(lease.monthlyRent, new Date(lease.paidUntil), hDate, handoverToBuyer);
                rentBuyerPays += res.buyerPaysSeller;
                rentSellerPays += res.sellerPaysBuyer;
                const tenantLabel = lease.tenantName ? `租客[${lease.tenantName}]` : `租客 #${index + 1}`;
                rentBreakdown += `${tenantLabel}:\n${res.breakdown}\n\n`;
            }
            if (lease.deposit > 0) {
                depositTransfer += lease.deposit;
                const tenantLabel = lease.tenantName ? `租客[${lease.tenantName}]` : `租客 #${index + 1}`;
                rentBreakdown += `${tenantLabel} 押金移轉: 賣方退還買方 $${money(lease.deposit)}\n`;
            }
        });
        rentSellerPays += depositTransfer; // Deposit moves from Seller to Buyer

        const rentRes = {
            buyerPaysSeller: rentBuyerPays,
            sellerPaysBuyer: rentSellerPays,
            breakdown: rentBreakdown || '無租約分算'
        };

        // 6. Aggregation
        const totalBuyerPays =
            landRes.buyerPaysSeller +
            houseRes.buyerPaysSeller +
            mgmtRes.buyerPaysSeller +
            parkRes.buyerPaysSeller +
            utilRes.buyerPaysSeller +
            rentRes.buyerPaysSeller +
            otherBuyerPays;

        const totalSellerPays =
            landRes.sellerPaysBuyer +
            houseRes.sellerPaysBuyer +
            mgmtRes.sellerPaysBuyer +
            parkRes.sellerPaysBuyer +
            utilRes.sellerPaysBuyer + // usually 0
            rentRes.sellerPaysBuyer +
            otherSellerPays;

        const net = totalBuyerPays - totalSellerPays;

        setResult({
            land: landRes,
            house: houseRes,
            mgmt: mgmtRes,
            park: parkRes,
            util: utilRes,
            rent: rentRes,
            totals: {
                buyerPays: totalBuyerPays,
                sellerPays: totalSellerPays,
                net: net
            }
        });

    }, [regDate, handoverDate, handoverToBuyer, landTaxMode, quickLandTax, lands, progStartValue, houseTaxMode, quickHouseTax, housePV, houseRateIdx, mgmtFee, mgmtPaidUntil, parkFee, parkPaidUntil, waterOverpay, elecOverpay, gasOverpay, leases, otherBuyerPays, otherSellerPays]);

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

                    {/* Dates */}
                    <section className="space-y-4">
                        <h3 className="section-title"><Calendar className="w-4 h-4" /> 關鍵日期</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="登記(過戶)日" type="date" value={regDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegDate(e.target.value)} />
                            <InputGroup label="交屋(分算)日" type="date" value={handoverDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHandoverDate(e.target.value)} />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-semibold px-2">交屋日歸屬</span>
                            <div className="flex gap-1">
                                <TabButton active={handoverToBuyer} onClick={() => setHandoverToBuyer(true)} label="歸買方" color="blue" />
                                <TabButton active={!handoverToBuyer} onClick={() => setHandoverToBuyer(false)} label="歸賣方" color="pink" />
                            </div>
                        </div>
                    </section>

                    <div className="divider" />

                    {/* Land Tax */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="section-title"><Home className="w-4 h-4" /> 地價稅 {landTaxMode === 'detailed' ? '(多筆累進)' : '(快速試算)'}</h3>
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
                                    <button onClick={addLand} className="btn-add"><Plus size={12} /> 新增土地</button>
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

                    <div className="divider" />

                    {/* House Tax */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="section-title"><Building2 className="w-4 h-4" /> 房屋稅 {houseTaxMode === 'detailed' ? '(現值稅率)' : '(快速試算)'}</h3>
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

                    <div className="divider" />

                    {/* Fees for Mgmt & Parking */}
                    <section className="space-y-4">
                        <h3 className="section-title"><DollarSign className="w-4 h-4" /> 管理費 / 車位費</h3>
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

                    <div className="divider" />

                    {/* Utilities & Others */}
                    <section className="space-y-4">
                        <h3 className="section-title"><Droplets className="w-4 h-4" /> 水電瓦斯溢繳 (賣方預繳)</h3>
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

                    <div className="divider" />

                    {/* Leases */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="section-title"><Sprout className="w-4 h-4" /> 租約分算</h3>
                            <button onClick={addLease} className="btn-add"><Plus size={12} /> 新增</button>
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

                </div>

                {/* Left Panel: Results */}
                <div className="lg:col-span-6 p-6 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-[800px] flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 分算結果 (Result)
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {result ? (
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
                                {leases.length > 0 && <ResultItem title="租金與押金" res={result.rent} icon={<Sprout size={16} />} />}
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
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50">
                                <ArrowRightLeft className="w-16 h-16 mb-4" />
                                <p>請輸入登記日與交屋日以開始計算</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}

// UI Components
const Label = ({ children }: { children: React.ReactNode }) => <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase text-ellipsis overflow-hidden whitespace-nowrap">{children}</label>;
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700" />;
const InputGroup = ({ label, ...props }: any) => (
    <div><Label>{label}</Label><Input {...props} /></div>
);
const TabButton = ({ active, label, color, onClick }: any) => {
    const activeClass = color === 'blue' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-pink-100 text-pink-700 shadow-sm';
    return (
        <button onClick={onClick} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${active ? activeClass : 'text-slate-400 hover:text-slate-600'}`}>
            {label}
        </button>
    );
};
function ResultItem({ title, icon, res }: { title: string, icon?: React.ReactNode, res: any }) {
    if (res.buyerPaysSeller === 0 && res.sellerPaysBuyer === 0) return null;
    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-blue-300 transition-colors group">
            <div className="flex justify-between items-start">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="p-1 bg-slate-200 rounded text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">{icon || <CheckCircle2 size={14} />}</span>
                    {title}
                </div>
                <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                    {res.buyerPaysSeller > 0 && (
                        <div className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-xs">
                            +${money(res.buyerPaysSeller)}
                        </div>
                    )}
                    {res.sellerPaysBuyer > 0 && (
                        <div className="text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded text-xs">
                            -${money(res.sellerPaysBuyer)}
                        </div>
                    )}
                </div>
            </div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-wrap pl-8 border-l-2 border-slate-200 ml-2">
                {res.breakdown}
            </div>
        </div>
    );
}
