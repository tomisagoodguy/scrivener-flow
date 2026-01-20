
import TaxRentCalculator from '@/components/features/financials/TaxRentCalculator';

export default function CalculatorPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    稅費分算試算 (Calculator)
                </h1>
                <p className="text-slate-500 font-bold text-sm">
                    獨立版不動產買賣稅費與租金分算工具
                </p>
            </div>

            <TaxRentCalculator />
        </div>
    );
}
