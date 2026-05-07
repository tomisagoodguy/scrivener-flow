'use client';

import type { UnifiedHolding, SortField, SortOrder } from './StockPickerHub.types';
import { HoldingsTableRow, SortIcon } from './HoldingsTableRow';

interface StockPickerTableProps {
    holdings: UnifiedHolding[];
    activeEtfCodes: string[];
    etfColorMap: Record<string, string>;
    selectedEtfsSize: number;
    sortField: SortField;
    sortOrder: SortOrder;
    signals: Record<string, { strength: 1 | 2 | 3; type: string }>;
    onSort: (f: SortField) => void;
    onOpenPanel: (code: string, name: string) => void;
}

const thBase = 'text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap';

export function StockPickerTable({
    holdings,
    activeEtfCodes,
    etfColorMap,
    selectedEtfsSize,
    sortField,
    sortOrder,
    signals,
    onSort,
    onOpenPanel,
}: StockPickerTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        <th className="text-left py-2 px-2 font-medium">股票</th>
                        <th className={thBase} onClick={() => onSort('shared_count')}>
                            共持 <SortIcon field="shared_count" currentSortField={sortField} currentSortOrder={sortOrder} />
                        </th>
                        <th className={thBase} onClick={() => onSort('filter_score')}>
                            動能分 <SortIcon field="filter_score" currentSortField={sortField} currentSortOrder={sortOrder} />
                        </th>
                        <th className={thBase} onClick={() => onSort('momentum_60d')}>
                            60日動能% <SortIcon field="momentum_60d" currentSortField={sortField} currentSortOrder={sortOrder} />
                        </th>
                        <th className={thBase} onClick={() => onSort('it_buy_5d')}>
                            投信5日 <SortIcon field="it_buy_5d" currentSortField={sortField} currentSortOrder={sortOrder} />
                        </th>
                        <th className={thBase} onClick={() => onSort('revenue_yoy')}>
                            YOY% <SortIcon field="revenue_yoy" currentSortField={sortField} currentSortOrder={sortOrder} />
                        </th>
                        <th className={thBase} onClick={() => onSort('amount')}>
                            成交額 <SortIcon field="amount" currentSortField={sortField} currentSortOrder={sortOrder} />
                        </th>
                        <th className={thBase} onClick={() => onSort('margin_ratio')}>
                            資券% <SortIcon field="margin_ratio" currentSortField={sortField} currentSortOrder={sortOrder} />
                        </th>
                        {activeEtfCodes.map(code => (
                            <th
                                key={code}
                                className={thBase}
                                onClick={() => onSort(`weight_${code}`)}
                                style={{ color: etfColorMap[code] }}
                            >
                                {code} <SortIcon field={`weight_${code}`} currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {holdings.map(h => (
                        <HoldingsTableRow
                            key={h.stock_code}
                            holding={h}
                            activeEtfCodes={activeEtfCodes}
                            selectedEtfsSize={selectedEtfsSize}
                            sortField={sortField}
                            sortOrder={sortOrder}
                            signals={signals}
                            onOpenPanel={onOpenPanel}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
