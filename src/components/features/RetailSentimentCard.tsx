import type { RetailSentiment } from '@/app/actions/getRetailSentiment';

interface Props {
    data: RetailSentiment | null;
}

interface SignalConfig {
    label: string;
    description: string;
    colorClass: string;
    bgClass: string;
}

function getSignalConfig(isAccelerating: boolean | null, isFragmented: boolean | null): SignalConfig {
    if (isAccelerating && !isFragmented) {
        return { label: '資金擴散', description: '短中天期偏多', colorClass: 'text-rose-600', bgClass: 'bg-rose-50' };
    }
    if (isAccelerating && isFragmented) {
        return { label: '矛盾期', description: '短多、120D審慎', colorClass: 'text-amber-500', bgClass: 'bg-amber-50' };
    }
    if (!isAccelerating && isFragmented) {
        return { label: '籌碼尾端', description: '長天期偏弱', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50' };
    }
    return { label: '中性', description: '依策略信號', colorClass: 'text-gray-500', bgClass: 'bg-gray-50' };
}

function formatChange(value: number | null): string {
    if (value == null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
}

function formatZScore(value: number | null): string {
    if (value == null) return '—';
    return `Z = ${value.toFixed(2)}`;
}

export default function RetailSentimentCard({ data }: Props) {
    if (!data) return null;

    const signal = getSignalConfig(data.is_retail_accelerating, data.is_odd_lot_fragmented);

    return (
        <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">散戶情緒指標</h3>
                <span className="text-xs text-gray-400">{data.date}</span>
            </div>

            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${signal.bgClass}`}>
                <span className={`text-lg font-bold ${signal.colorClass}`}>{signal.label}</span>
                <span className="text-xs text-gray-500">{signal.description}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <div className="text-xs text-gray-500 mb-1">12 週小戶變化</div>
                    <div className={`text-base font-semibold ${signal.colorClass}`}>
                        {formatChange(data.small_holder_chg_12w)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 mb-1">Z-score</div>
                    <div className="text-base font-semibold text-gray-700 dark:text-gray-300">
                        {formatZScore(data.small_holder_z_score)}
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded-full border ${
                    data.is_retail_accelerating
                        ? 'border-rose-300 text-rose-600 bg-rose-50'
                        : 'border-gray-200 text-gray-400 bg-gray-50'
                }`}>
                    人數加速（P90）
                </span>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                    data.is_odd_lot_fragmented
                        ? 'border-emerald-300 text-emerald-600 bg-emerald-50'
                        : 'border-gray-200 text-gray-400 bg-gray-50'
                }`}>
                    零股碎片化
                </span>
            </div>
        </div>
    );
}
