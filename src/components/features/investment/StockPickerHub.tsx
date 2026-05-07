'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { StockDetailPanel } from './StockDetailPanel';
import { FactorFilterChips } from './FactorFilterChips';
import { StockPickerTable } from './StockPickerTable';
import { useStockPickerHub } from '@/hooks/investment/useStockPickerHub';
import type { StockPickerHubProps } from './StockPickerHub.types';

export function StockPickerHub({ etfs, quantFilters, signals = {} }: StockPickerHubProps) {
    const {
        panelStock,
        searchQuery,
        selectedEtfs,
        activeFactors,
        sortField,
        sortOrder,
        etfColorMap,
        sortedHoldings,
        activeEtfCodes,
        openPanel,
        closePanel,
        setSearchQuery,
        toggleEtf,
        toggleFactor,
        clearFactors,
        handleSort,
    } = useStockPickerHub(etfs, quantFilters, signals);

    return (
        <>
            <StockDetailPanel
                stockCode={panelStock?.code ?? null}
                stockName={panelStock?.name}
                onClose={closePanel}
            />
            <div className="glass-card rounded-2xl p-6 space-y-4">
                {/* 搜尋列 */}
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="搜尋股票代碼或名稱…"
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-slate-800 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* ETF 篩選勾選框 */}
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">篩選 ETF：</span>
                    {etfs.map(etf => (
                        <label key={etf.etf_code} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={selectedEtfs.has(etf.etf_code)}
                                onChange={() => toggleEtf(etf.etf_code)}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: etf.color }}
                            />
                            <span
                                className="text-sm font-medium px-2 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: etf.color + '20',
                                    color: etf.color,
                                    border: `1px solid ${etf.color}60`,
                                }}
                            >
                                {etf.etf_code}
                            </span>
                        </label>
                    ))}
                    <span className="text-xs text-slate-400 ml-auto">
                        共 {sortedHoldings.length} 支個股
                    </span>
                </div>

                {/* 因子篩選 */}
                <FactorFilterChips
                    activeFactors={activeFactors}
                    selectedEtfsSize={selectedEtfs.size}
                    onToggle={toggleFactor}
                    onClear={clearFactors}
                />

                {/* 持股表格 */}
                <StockPickerTable
                    holdings={sortedHoldings}
                    activeEtfCodes={activeEtfCodes}
                    etfColorMap={etfColorMap}
                    selectedEtfsSize={selectedEtfs.size}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    signals={signals}
                    onSort={handleSort}
                    onOpenPanel={openPanel}
                />
            </div>
        </>
    );
}
