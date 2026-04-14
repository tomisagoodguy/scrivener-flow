'use client';

import { useState, useEffect, useTransition } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { X, Star, Trash2, Plus, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CustomWatchlistItem } from '@/types';
import {
    getWatchList,
    addWatchStock,
    removeWatchStock,
} from '@/app/actions/investment/watchListActions';

interface WatchlistDrawerProps {
    open: boolean;
    onClose: () => void;
}

export function WatchlistDrawer({ open, onClose }: WatchlistDrawerProps) {
    const [items, setItems] = useState<CustomWatchlistItem[]>([]);
    const [search, setSearch] = useState('');
    const [isPending, startTransition] = useTransition();
    const notify = useNotification();

    useEffect(() => {
        const el = document.getElementById('investment-page-content');
        if (!el) return;
        el.style.paddingRight = open ? '24rem' : '';
        return () => { el.style.paddingRight = ''; };
    }, [open]);

    // Load watchlist when drawer opens
    useEffect(() => {
        if (!open) return;
        startTransition(async () => {
            const data = await getWatchList();
            setItems(data);
        });
    }, [open]);

    function handleAdd() {
        const code = search.trim().toUpperCase();
        if (!code) return;
        startTransition(async () => {
            const result = await addWatchStock(code);
            if (!result.success) {
                notify.error(result.error ?? '新增失敗');
                return;
            }
            if (result.item) setItems(prev => [result.item!, ...prev]);
            setSearch('');
            notify.success(`已加入「${code}」`);
        });
    }

    function handleRemove(stockId: string) {
        startTransition(async () => {
            const result = await removeWatchStock(stockId);
            if (!result.success) {
                notify.error(result.error ?? '移除失敗');
                return;
            }
            setItems(prev => prev.filter(i => i.stock_id !== stockId));
        });
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') handleAdd();
    }

    return (
        <>
            {/* Drawer */}
            <div
                className={`fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] w-full md:w-96 flex flex-col
                    backdrop-blur-xl bg-white/80 border-l border-white/50 shadow-2xl
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                        <h2 className="text-lg font-semibold text-slate-900">自選股清單</h2>
                        <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            {items.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Link
                            href="/investment/watch-list"
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            title="完整管理頁"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            aria-label="關閉"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Add Stock Section */}
                <div className="px-5 py-4 border-b border-slate-200/60 space-y-2">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">新增股票</p>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="輸入股票代號，如 2330"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={isPending || !search.trim()}
                            className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            加入
                        </button>
                    </div>
                    <p className="text-xs text-slate-400">策略標籤請至完整管理頁設定</p>
                </div>

                {/* Watchlist Items */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                    {isPending && items.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                            載入中…
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
                            <Star className="w-8 h-8 text-slate-200" />
                            <p className="text-sm">尚未加入任何股票</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/60 border border-white/50 shadow-sm hover:bg-white/80 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="font-bold text-slate-800 text-sm shrink-0">{item.stock_id}</span>
                                    {item.name && (
                                        <span className="text-xs text-slate-500 truncate">{item.name}</span>
                                    )}
                                    {item.strategies?.length > 0 && (
                                        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                                            {item.strategies.length} 策略
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleRemove(item.stock_id)}
                                    disabled={isPending}
                                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all disabled:opacity-30 shrink-0"
                                    aria-label={`移除 ${item.stock_id}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </>
    );
}
