import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Image, Minus, Text } from 'lucide-react';

export interface CommandItemProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: (props: any) => void;
}

interface CommandListProps {
    items: CommandItemProps[];
    command: (item: CommandItemProps) => void;
}

export const CommandList = forwardRef((props: CommandListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }

            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }

            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[300px] z-50">
            <div className="max-h-[300px] overflow-y-auto p-1 scrollbar-hide">
                {props.items.length ? (
                    props.items.map((item, index) => (
                        <button
                            key={index}
                            className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${index === selectedIndex
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                }`}
                            onClick={() => selectItem(index)}
                        >
                            <div className="flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                                {item.icon}
                            </div>
                            <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="p-3 text-sm text-slate-500 text-center">No results</div>
                )}
            </div>
        </div>
    );
});

CommandList.displayName = 'CommandList';
