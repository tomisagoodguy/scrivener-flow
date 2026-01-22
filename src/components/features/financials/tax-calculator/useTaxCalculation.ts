import { useState, useEffect } from 'react';
import { LandItem } from '@/lib/calculatorUtils';
import { LeaseItem, TaxCalculationResult } from './types';
import {
    calculateLandTaxProration,
    calculateHouseTaxProration,
    calculateFeeProration,
    calculateRentProration,
    calculateAnnualLandTax,
    HOUSE_TAX_SCENARIOS,
    money
} from '@/lib/calculatorUtils';

/**
 * useTaxCalculation Hook
 * 處理所有稅費分算的狀態管理與計算邏輯
 */
export function useTaxCalculation(initialRegDate?: string, initialHandoverDate?: string) {
    // --- Core Dates ---
    const [regDate, setRegDate] = useState<string>(initialRegDate || '');
    const [handoverDate, setHandoverDate] = useState<string>(initialHandoverDate || '');
    const [handoverToBuyer, setHandoverToBuyer] = useState<boolean>(true);

    // --- Land Tax ---
    const [landTaxMode, setLandTaxMode] = useState<'detailed' | 'quick'>('quick');
    const [lands, setLands] = useState<LandItem[]>([]);
    const [progStartValue, setProgStartValue] = useState<number>(1700000);
    const [quickLandTax, setQuickLandTax] = useState<number>(0);

    // --- House Tax ---
    const [houseTaxMode, setHouseTaxMode] = useState<'detailed' | 'quick'>('quick');
    const [housePV, setHousePV] = useState<string | number>(0);
    const [houseRateIdx, setHouseRateIdx] = useState<number>(1);
    const [quickHouseTax, setQuickHouseTax] = useState<number>(0);

    // --- Monthly Fees ---
    const [mgmtFee, setMgmtFee] = useState<number>(0);
    const [mgmtPaidUntil, setMgmtPaidUntil] = useState<string>('');
    const [parkFee, setParkFee] = useState<number>(0);
    const [parkPaidUntil, setParkPaidUntil] = useState<string>('');

    // --- Utilities ---
    const [waterOverpay, setWaterOverpay] = useState<number>(0);
    const [elecOverpay, setElecOverpay] = useState<number>(0);
    const [gasOverpay, setGasOverpay] = useState<number>(0);

    // --- Leases ---
    const [leases, setLeases] = useState<LeaseItem[]>([]);

    // --- Other Adjustments ---
    const [otherBuyerPays, setOtherBuyerPays] = useState<number>(0);
    const [otherSellerPays, setOtherSellerPays] = useState<number>(0);

    // --- Results ---
    const [result, setResult] = useState<TaxCalculationResult | null>(null);

    // --- Helper Functions ---
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

    // --- Main Calculation Effect ---
    useEffect(() => {
        if (!regDate || !handoverDate) {
            setResult(null);
            return;
        }

        const rDate = new Date(regDate);
        const hDate = new Date(handoverDate);

        // 1. Calculate Annual Taxes - Land
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

        // 2. Calculate Annual Taxes - House
        let annualHouseTax = 0;
        let houseDetail = '';
        const scenario = HOUSE_TAX_SCENARIOS[houseRateIdx] || HOUSE_TAX_SCENARIOS[1];
        const houseRate = scenario?.rate || 0.012;

        let parsedHousePV = 0;
        if (typeof housePV === 'string' && housePV.includes('-')) {
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

        // 3. Prorate Taxes
        const landRes = calculateLandTaxProration(annualLandTax, hDate, rDate, handoverToBuyer);
        landRes.breakdown = `【地價稅年繳額計算】\n${landDetail}\n= 年稅額 $${money(annualLandTax)}\n\n` + landRes.breakdown;

        const houseRes = calculateHouseTaxProration(annualHouseTax, hDate, rDate, handoverToBuyer);
        houseRes.breakdown = `【房屋稅年繳額計算】\n${houseDetail}\n= 年稅額 $${money(annualHouseTax)}\n\n` + houseRes.breakdown;

        // 4. Calculate Fees
        let mgmtRes = { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '' };
        if (mgmtFee > 0 && mgmtPaidUntil) {
            mgmtRes = calculateFeeProration(mgmtFee, new Date(mgmtPaidUntil), hDate, handoverToBuyer);
        }

        let parkRes = { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '' };
        if (parkFee > 0 && parkPaidUntil) {
            parkRes = calculateFeeProration(parkFee, new Date(parkPaidUntil), hDate, handoverToBuyer);
        }

        // 5. Utilities (Overpayment)
        const utilTotal = waterOverpay + elecOverpay + gasOverpay;
        const utilRes = {
            buyerPaysSeller: utilTotal,
            sellerPaysBuyer: 0,
            breakdown: utilTotal > 0
                ? `水費 $${money(waterOverpay)} + 電費 $${money(elecOverpay)} + 瓦斯 $${money(gasOverpay)} = $${money(utilTotal)}\n(賣方溢繳/預繳，由買方歸還)`
                : '無溢繳金額'
        };

        // 6. Leases
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
        rentSellerPays += depositTransfer;

        const rentRes = {
            buyerPaysSeller: rentBuyerPays,
            sellerPaysBuyer: rentSellerPays,
            breakdown: rentBreakdown || '無租約分算'
        };

        // 7. Aggregation
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
            utilRes.sellerPaysBuyer +
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

    return {
        // Core Dates
        regDate, setRegDate,
        handoverDate, setHandoverDate,
        handoverToBuyer, setHandoverToBuyer,

        // Land Tax
        landTaxMode, setLandTaxMode,
        lands, addLand, removeLand, updateLand,
        progStartValue, setProgStartValue,
        quickLandTax, setQuickLandTax,

        // House Tax
        houseTaxMode, setHouseTaxMode,
        housePV, setHousePV,
        houseRateIdx, setHouseRateIdx,
        quickHouseTax, setQuickHouseTax,

        // Fees
        mgmtFee, setMgmtFee,
        mgmtPaidUntil, setMgmtPaidUntil,
        parkFee, setParkFee,
        parkPaidUntil, setParkPaidUntil,

        // Utilities
        waterOverpay, setWaterOverpay,
        elecOverpay, setElecOverpay,
        gasOverpay, setGasOverpay,

        // Leases
        leases, addLease, removeLease, updateLease,

        // Other
        otherBuyerPays, setOtherBuyerPays,
        otherSellerPays, setOtherSellerPays,

        // Actions
        handleClearAll,

        // Results
        result,
    };
}
