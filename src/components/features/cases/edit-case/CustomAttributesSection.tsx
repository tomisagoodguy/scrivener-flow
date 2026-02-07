'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomAttributesSectionProps {
    attributes: Record<string, any>;
    setAttributes: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    isAttributesExpanded: boolean;
    setIsAttributesExpanded: (expanded: boolean) => void;
}

export const CustomAttributesSection: React.FC<CustomAttributesSectionProps> = ({
    attributes,
    setAttributes,
    isAttributesExpanded,
    setIsAttributesExpanded
}) => {
    // Filter out internal system attributes or complex objects
    const displayAttributes = Object.entries(attributes).filter(([key, value]) => {
        if (key === 'loan_estimates') return false;
        if (typeof value === 'object' && value !== null) return false;
        return true;
    });

    return (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl mt-6 shadow-inner overflow-hidden transition-all">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                onClick={() => setIsAttributesExpanded(!isAttributesExpanded)}
            >
                <div className="flex items-center gap-2">
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isAttributesExpanded ? 'rotate-180' : ''}`} />
                    <h4 className="text-sm font-black text-slate-500 tracking-widest uppercase">
                        ⚙️ 自定義屬性 (Case Attributes)
                    </h4>
                    {displayAttributes.length > 0 && (
                        <span className="text-[10px] bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {displayAttributes.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">EXPERIMENTAL</span>
                    {isAttributesExpanded && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const key = prompt('請輸入新欄位名稱 (例如：案件來源、居留證號):');
                                if (key) setAttributes(prev => ({ ...prev, [key]: '' }));
                            }}
                            className="text-[11px] font-black bg-white dark:bg-slate-800 text-slate-600 px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm active:scale-95"
                        >
                            ＋ 新增欄位
                        </button>
                    )}
                </div>
            </div>

            {isAttributesExpanded && (
                <div className="p-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                        {displayAttributes.map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-sm group hover:border-primary/30 transition-all">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{key}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm(`確定刪除「${key}」欄位嗎？內容將遺失。`)) {
                                                const newAttrs = { ...attributes };
                                                delete newAttrs[key];
                                                setAttributes(newAttrs);
                                            }
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="text-xs">✕</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => setAttributes(prev => ({ ...prev, [key]: e.target.value }))}
                                    placeholder="輸入內容..."
                                    className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 focus:outline-none placeholder:text-slate-300 text-slate-700 dark:text-slate-200"
                                />
                            </div>
                        ))}
                        {displayAttributes.length === 0 && (
                            <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                <p className="text-xs text-slate-400 italic">目前沒有自定義屬性。使用右上方按鈕為此案件建立專屬欄位。</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
