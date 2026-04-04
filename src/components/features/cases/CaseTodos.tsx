'use client';

import { useState, useEffect, useRef } from 'react';
import { useCaseTodos } from '@/hooks/useCaseTodos';
import { Plus, X, Check } from 'lucide-react';

interface CaseTodosProps {
    caseId: string;
    initialTodos: Record<string, boolean>;
    items: string[];
    hideCompleted?: boolean;
    allowAdd?: boolean;
    prefix?: string; // e.g. "SIG_" for Signing, "SEAL_" for Sealing…
    catchUncategorized?: boolean; // If true, show items that don't match any standard list or known prefix
    allKnownPrefixes?: readonly string[]; // All known prefixes across all stages (for uncategorized detection)
    onCountChange?: (completed: number, total: number) => void;
}

export default function CaseTodos({
    caseId,
    initialTodos,
    items,
    hideCompleted = false,
    allowAdd = false,
    prefix = '',
    catchUncategorized = false,
    allKnownPrefixes = ['S_', 'T_'],
    onCountChange,
}: CaseTodosProps) {
    const { todos, loadingItem, toggleTodo, addTodo, deleteTodo } = useCaseTodos(caseId, initialTodos, prefix);

    // 離場動畫：記錄正在執行淡出的 item keys
    const [leavingItems, setLeavingItems] = useState<Set<string>>(new Set());
    // 記錄上一次的 hideCompleted，用來偵測模式切換
    const prevHideCompleted = useRef(hideCompleted);

    // New State for adding tasks
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');

    // 計算 displayItems（在 hooks 依賴項之前先算好）
    const knownPrefixes = allKnownPrefixes;
    const standardSet = new Set(items);
    const prefixedItems = prefix ? items.map((i) => (i.startsWith(prefix) ? i : `${prefix}${i}`)) : items;
    const prefixedStandardSet = new Set(prefixedItems);

    const customKeys = Object.keys(todos).filter((key) => {
        if (!isNaN(Number(key))) return false;
        if (standardSet.has(key)) return false;
        if (prefixedStandardSet.has(key)) return false;
        if (prefix && key.startsWith(prefix)) return true;
        if (catchUncategorized) {
            const hasKnownPrefix = knownPrefixes.some((p) => key.startsWith(p));
            if (!hasKnownPrefix) return true;
        }
        return false;
    });

    const displayItems = [...prefixedItems, ...customKeys];

    // 用 ref 儲存最新的 callback，避免 callback 參考變動觸發無限重渲染
    const onCountChangeRef = useRef(onCountChange);
    onCountChangeRef.current = onCountChange;

    // 上報計數給父元件（依賴項只有資料，不含 callback ref）
    useEffect(() => {
        if (!onCountChangeRef.current) return;
        const total = displayItems.length;
        const completed = displayItems.filter((item) => todos[item]).length;
        onCountChangeRef.current(completed, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todos, displayItems.join(',')]);

    // 當 hideCompleted 從 false 切換回 true 時，清除 leavingItems（避免殘留動畫狀態）
    useEffect(() => {
        if (!hideCompleted && prevHideCompleted.current) {
            setLeavingItems(new Set());
        }
        prevHideCompleted.current = hideCompleted;
    }, [hideCompleted]);

    const handleToggle = (e: React.MouseEvent, item: string) => {
        e.preventDefault();
        e.stopPropagation();

        const willBeCompleted = !todos[item];

        // 若切換後為「已完成」且目前處於「隱藏已完成」模式 → 觸發離場動畫
        if (willBeCompleted && hideCompleted) {
            toggleTodo(item);
            // 短暫延遲後加入 leavingItems，讓綠色完成狀態先顯示
            setTimeout(() => {
                setLeavingItems((prev) => new Set(prev).add(item));
                // 動畫完成後從 leavingItems 移除（讓 filter 自然隱藏）
                setTimeout(() => {
                    setLeavingItems((prev) => {
                        const next = new Set(prev);
                        next.delete(item);
                        return next;
                    });
                }, 350);
            }, 150);
        } else {
            toggleTodo(item);
        }
    };

    const handleAddTask = async () => {
        if (!newTaskName.trim()) return;
        try {
            await addTodo(newTaskName);
            setIsAdding(false);
            setNewTaskName('');
        } catch {
            // Error handled in hook
        }
    };

    const handleDeleteTask = async (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('確定要刪除此事項嗎？')) {
            deleteTodo(key);
        }
    };

    const getDisplayName = (key: string) => {
        if (prefix && key.startsWith(prefix)) return key.substring(prefix.length);
        return key;
    };

    // 決定哪些 items 需要 render（考量 hideCompleted + leavingItems 動畫）
    const visibleItems = displayItems.filter((item) => {
        if (!hideCompleted) return true;
        // 正在執行離場動畫的 item 仍然顯示（動畫中）
        if (leavingItems.has(item)) return true;
        // 已完成且不在動畫中 → 隱藏
        return !todos[item];
    });

    return (
        <div className="flex flex-wrap gap-2 py-2 items-center">
            {visibleItems.map((item) => {
                const displayName = getDisplayName(item);
                const isCustom = customKeys.includes(item);
                const isCompleted = todos[item];
                const isLeaving = leavingItems.has(item);

                return (
                    <div
                        key={item}
                        className="relative group flex items-center"
                        style={{
                            transition: 'opacity 200ms ease-out, max-height 300ms ease-in-out, margin 300ms ease-in-out',
                            maxHeight: isLeaving ? '0' : '48px',
                            opacity: isLeaving ? 0 : 1,
                            overflow: 'hidden',
                            marginBottom: isLeaving ? '-8px' : '0',
                        }}
                    >
                        <button
                            type="button"
                            onClick={(e) => handleToggle(e, item)}
                            disabled={loadingItem === item}
                            className={`
                                px-3 py-1.5 rounded-full text-[12px] font-bold transition-all
                                border-2 flex items-center gap-1.5
                                ${isCompleted
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                }
                                ${loadingItem === item ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                                ${isCustom ? 'pr-7' : ''} 
                            `}
                        >
                            {isCompleted ? (
                                <svg
                                    className="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            )}

                            {displayName}
                        </button>

                        {isCustom && (
                            <button
                                type="button"
                                onClick={(e) => handleDeleteTask(e, item)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/10 hover:bg-red-500 hover:text-white text-black/40 transition-all opacity-0 group-hover:opacity-100 z-10"
                                title="刪除此事項"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                );
            })}

            {allowAdd &&
                (isAdding ? (
                    <div className="flex items-center gap-1 border border-blue-200 rounded-full px-2 py-1 bg-blue-50">
                        <input
                            autoFocus
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTask();
                                }
                            }}
                            className="text-[12px] bg-transparent outline-none w-24 text-blue-800 placeholder:text-blue-300 min-w-[80px]"
                            placeholder="輸入事項..."
                        />
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                handleAddTask();
                            }}
                            className="text-green-600 hover:text-green-800 p-0.5"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setIsAdding(false);
                            }}
                            className="text-red-500 hover:text-red-700 p-0.5"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setIsAdding(true);
                        }}
                        className="
                            px-3 py-1.5 rounded-full text-[12px] font-bold transition-all
                            border-2 border-dashed border-slate-300 text-slate-400 
                            hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 
                            flex items-center gap-1.5 cursor-pointer opacity-70 hover:opacity-100
                        "
                    >
                        <Plus size={14} />
                        <span>新增</span>
                    </button>
                ))}
        </div>
    );
}
