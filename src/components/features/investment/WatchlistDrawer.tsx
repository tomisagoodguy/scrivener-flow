'use client';

import { useState, useEffect, useTransition } from 'react';
import { X, Star, Trash2, Plus, Search } from 'lucide-react';
import { CustomWatchlistItem } from '@/types';
import {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
} from '@/app/actions/watchlist';

interface WatchlistDrawerProps {
    open: boolean;
    onClose: () => void;
}

export function WatchlistDrawer({ open, onClose }: WatchlistDrawerProps) {
    const [items, setItems] = useState<CustomWatchlistItem[]>([]);
    const [search, setSearch] = useState('');
    const [label, setLabel] = useState('');
    const [toast, setToast] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Load watchlist when drawer opens
    useEffect(() => {
        if (!open) return;
        startTransition(async () => {
            const data = await getWatchlist();
            setItems(data);
        });
    }, [open]);

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    }

    function handleAdd() {
        const code = search.trim().toUpperCase();
        if (!code) return;
        const enteredLabel = label.trim() || '自選';
        startTransition(async () => {
            const result = await addToWatchlist(code, enteredLabel);
            if (result.duplicate) {
                showToast(`「${code}」已在自選清單中`);
                return;
            }
            if (!result.success) {
                showToast(`新增失敗：${result.error ?? '未知錯誤'}`);
                return;
            }
            const refreshed = await getWatchlist();
            setItems(refreshed);
            setSearch('');
            setLabel('');
            showToast(`已加入「${code}」`);
        });
    }

    function handleRemove(stockCode: string) {
        startTransition(async () => {
            const result = await removeFromWatchlist(stockCode);
            if (!result.success) {
                showToast(`移除失敗：${result.error ?? '未知錯誤'}`);
                return;
            }
            setItems(prev => prev.filter(i => i.stock_code !== stockCode));
        });
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') handleAdd();
    }

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 z-50 h-full w-full md:w-96 flex flex-col
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
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        aria-label="關閉"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Add Stock Section */}
                <div className="px-5 py-4 border-b border-slate-200/60 space-y-3">
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
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="標籤（選填，預設「自選」）"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                        />
                    </div>
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
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-800 text-sm">{item.stock_code}</span>
                                    <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                                        {item.label}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemove(item.stock_code)}
                                    disabled={isPending}
                                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all disabled:opacity-30"
                                    aria-label={`移除 ${item.stock_code}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Toast */}
                {toast && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl shadow-lg whitespace-nowrap animate-fade-in">
                        {toast}
                    </div>
                )}
            </div>
        </>
    );
}
