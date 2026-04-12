'use client';

import { useState, useTransition } from 'react';
import { Trash2, Plus, Tag } from 'lucide-react';
import {
    addWatchStock,
    removeWatchStock,
    updateWatchStrategies,
} from '@/app/actions/investment/watchListActions';
import { PREDEFINED_STRATEGIES } from '@/app/actions/investment/watchListConstants';

interface WatchItem {
    id: string;
    stock_id: string;
    name: string;
    strategies: string[];
    created_at: string;
}

interface Props {
    initialList: WatchItem[];
}

export function WatchListManager({ initialList }: Props) {
    const [list, setList] = useState<WatchItem[]>(initialList);
    const [inputCode, setInputCode] = useState('');
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isPending, startTransition] = useTransition();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    function toggleStrategy(s: string) {
        setSelectedStrategies((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
        );
    }

    function handleAdd() {
        const sid = inputCode.trim().toUpperCase();
        if (!sid) return;
        setErrorMsg('');
        startTransition(async () => {
            const res = await addWatchStock(sid, selectedStrategies as never[]);
            if (!res.success) {
                setErrorMsg(res.error ?? '新增失敗');
                return;
            }
            setList((prev) => [
                ...prev,
                { id: crypto.randomUUID(), stock_id: sid, name: '', strategies: selectedStrategies, created_at: new Date().toISOString() },
            ]);
            setInputCode('');
            setSelectedStrategies([]);
        });
    }

    function handleDelete(item: WatchItem) {
        if (!confirm(`確定要移除 ${item.stock_id}${item.name ? ` ${item.name}` : ''} 嗎？`)) return;
        setDeletingId(item.id);
        startTransition(async () => {
            const res = await removeWatchStock(item.stock_id);
            if (res.success) {
                setList((prev) => prev.filter((w) => w.id !== item.id));
            } else {
                setErrorMsg(res.error ?? '刪除失敗');
            }
            setDeletingId(null);
        });
    }

    function handleStrategySave(item: WatchItem, strategies: string[]) {
        startTransition(async () => {
            await updateWatchStrategies(item.stock_id, strategies as never[]);
            setList((prev) =>
                prev.map((w) => w.id === item.id ? { ...w, strategies } : w)
            );
            setEditingId(null);
        });
    }

    return (
        <div className="space-y-4">
            {/* 新增區 */}
            <div className="glass-card p-5 rounded-2xl">
                <h2 className="text-sm font-semibold text-gray-600 mb-3">新增自選股</h2>
                <div className="flex gap-2 mb-3">
                    <input
                        className="flex-1 bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="輸入股票代碼（如 2330）"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        maxLength={6}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={isPending || !inputCode.trim()}
                        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={15} /> 加入
                    </button>
                </div>

                {/* 策略標籤選擇 */}
                <div className="flex flex-wrap gap-2">
                    {PREDEFINED_STRATEGIES.map((s) => (
                        <button
                            key={s}
                            onClick={() => toggleStrategy(s)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                selectedStrategies.includes(s)
                                    ? 'bg-blue-100 border-blue-400 text-blue-700'
                                    : 'bg-white/60 border-gray-200 text-gray-500 hover:border-blue-300'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {errorMsg && (
                    <p className="text-red-500 text-xs mt-2">{errorMsg}</p>
                )}
            </div>

            {/* 清單 */}
            {list.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">
                    尚無自選股，輸入股票代碼開始追蹤
                </div>
            ) : (
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="divide-y divide-gray-100/60">
                        {list.map((item, i) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 px-5 py-4 animate-slide-up hover:bg-white/30 transition-colors"
                                style={{ animationDelay: `${i * 40}ms` }}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800">{item.stock_id}</span>
                                        {item.name && (
                                            <span className="text-sm text-gray-500">{item.name}</span>
                                        )}
                                    </div>
                                    {/* 策略標籤顯示/編輯 */}
                                    {editingId === item.id ? (
                                        <StrategyEditor
                                            current={item.strategies}
                                            onSave={(s) => handleStrategySave(item, s)}
                                            onCancel={() => setEditingId(null)}
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.strategies.length > 0
                                                ? item.strategies.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="text-[11px] px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full"
                                                    >
                                                        {s}
                                                    </span>
                                                ))
                                                : <span className="text-xs text-gray-300">無策略標籤</span>
                                            }
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="編輯策略"
                                    >
                                        <Tag size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item)}
                                        disabled={deletingId === item.id}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 rounded-lg transition-colors"
                                        title="移除"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-5 py-2.5 bg-gray-50/40 text-xs text-gray-400 text-right">
                        {list.length} / 50 支股票
                    </div>
                </div>
            )}
        </div>
    );
}

function StrategyEditor({
    current,
    onSave,
    onCancel,
}: {
    current: string[];
    onSave: (s: string[]) => void;
    onCancel: () => void;
}) {
    const [selected, setSelected] = useState<string[]>(current);

    function toggle(s: string) {
        setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    }

    return (
        <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_STRATEGIES.map((s) => (
                    <button
                        key={s}
                        onClick={() => toggle(s)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            selected.includes(s)
                                ? 'bg-blue-100 border-blue-400 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-400'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onSave(selected)}
                    className="text-xs px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                    儲存
                </button>
                <button
                    onClick={onCancel}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                    取消
                </button>
            </div>
        </div>
    );
}
