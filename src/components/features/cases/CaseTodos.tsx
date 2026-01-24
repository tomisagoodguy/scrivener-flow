'use client';

import { useState } from 'react';
import { useCaseTodos } from '@/hooks/useCaseTodos';
import { useRouter } from 'next/navigation';
import { Plus, X, Check } from 'lucide-react';

interface CaseTodosProps {
    caseId: string;
    initialTodos: Record<string, boolean>;
    items: string[];
    hideCompleted?: boolean;
    allowAdd?: boolean;
    prefix?: string; // e.g. "S_" for Signing, "T_" for Transfer
    catchUncategorized?: boolean; // If true, show items that don't match any standard list or known prefix
}

export default function CaseTodos({
    caseId,
    initialTodos,
    items,
    hideCompleted = false,
    allowAdd = false,
    prefix = '',
    catchUncategorized = false
}: CaseTodosProps) {
    const { todos, loadingItem, toggleTodo, addTodo, deleteTodo } = useCaseTodos(caseId, initialTodos, prefix);
    const router = useRouter();



    // New State for adding tasks
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');

    const handleToggle = (e: React.MouseEvent, item: string) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTodo(item);
    };

    const handleAddTask = async () => {
        if (!newTaskName.trim()) return;
        try {
            await addTodo(newTaskName);
            setIsAdding(false);
            setNewTaskName('');
        } catch (e) {
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



    // Calculate display items
    // 1. Standard items (always shown unless hideCompleted)
    // 2. Custom items matching prefix
    // 3. Uncategorized items (if catchUncategorized is true)

    const knownPrefixes = ['S_', 'T_']; // Hardcoded known prefixes to detect uncategorized
    const standardSet = new Set(items);

    // Determine the actual keys we expect for standard items
    const prefixedItems = prefix ? items.map((i) => (i.startsWith(prefix) ? i : `${prefix}${i}`)) : items;
    const prefixedStandardSet = new Set(prefixedItems);

    const customKeys = Object.keys(todos).filter(key => {
        // Filter out numeric keys (artifacts from legacy Array storage)
        if (!isNaN(Number(key))) return false;

        if (standardSet.has(key)) return false; // Already in standard list (raw)
        if (prefixedStandardSet.has(key)) return false; // Already in standard list (prefixed)

        if (prefix && key.startsWith(prefix)) return true; // Matches our prefix

        if (catchUncategorized) {
            // Check if it starts with ANY known prefix
            const hasKnownPrefix = knownPrefixes.some(p => key.startsWith(p));
            if (!hasKnownPrefix) return true; // No prefix, so it's uncategorized
        }

        return false;
    });

    const displayItems = [...prefixedItems, ...customKeys];

    const getDisplayName = (key: string) => {
        if (prefix && key.startsWith(prefix)) return key.substring(prefix.length);
        // Also strip other known prefixes if showing uncategorized to be clean? 
        // No, show raw if uncategorized so user knows.
        return key;
    };



    // Debug logging

    return (
        <div className="flex flex-wrap gap-2 py-2 items-center">
            {displayItems
                .filter((item) => !hideCompleted || !todos[item])
                .map((item) => {
                    const displayName = getDisplayName(item);

                    // Check if is custom task (in customKeys)
                    const isCustom = customKeys.includes(item);
                    const isCompleted = todos[item];

                    // Debug rendering
                    // console.log(`Rendering Item: ${item}, Completed: ${isCompleted}`);

                    return (
                        <div key={item} className="relative group flex items-center">
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
