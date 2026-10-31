import { formatReturnPct, groupByIndustry, returnColorClass } from '@/lib/investment/strategyTradeUtils';
import type { StrategyTrade } from '@/lib/investment/strategyTradeUtils';

/** 持有中個股依產業彙總（檔數、平均報酬、正／負報酬檔數），依平均報酬遞減 */
export default function TradeIndustryTable({ trades }: { trades: StrategyTrade[] }) {
    const groups = groupByIndustry(trades);
    if (groups.length === 0) return null;

    return (
        <div className="min-w-0 overflow-x-auto">
            <h3 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">產業彙總</h3>
            <table data-testid="trade-industry" className="w-full text-xs tabular-nums">
                <thead>
                    <tr className="text-left text-[11px] text-gray-500 dark:text-gray-400">
                        <th className="py-1 font-normal">產業</th>
                        <th className="py-1 text-right font-normal">檔數</th>
                        <th className="py-1 text-right font-normal">平均報酬</th>
                        <th className="py-1 text-right font-normal">正報酬</th>
                        <th className="py-1 text-right font-normal">負報酬</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/70 dark:divide-gray-700/50">
                    {groups.map((g) => (
                        <tr key={g.industry}>
                            <td className="py-1 text-gray-800 dark:text-gray-100">{g.industry}</td>
                            <td className="py-1 text-right text-gray-600 dark:text-gray-300">{g.count}</td>
                            <td className={`py-1 text-right font-medium ${returnColorClass(g.avgReturn)}`}>
                                {formatReturnPct(g.avgReturn)}
                            </td>
                            <td className="py-1 text-right text-rose-600 dark:text-rose-400">{g.positive}</td>
                            <td className="py-1 text-right text-emerald-600 dark:text-emerald-400">{g.negative}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
