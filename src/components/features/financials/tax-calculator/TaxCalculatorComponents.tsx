import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { money } from '@/lib/calculatorUtils';
import { ProrationResult } from './types';

// --- Basic Form Components ---
export const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase text-ellipsis overflow-hidden whitespace-nowrap">
        {children}
    </label>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
    />
);

export const InputGroup = ({ label, ...props }: any) => (
    <div>
        <Label>{label}</Label>
        <Input {...props} />
    </div>
);

export const TabButton = ({ active, label, color, onClick }: any) => {
    const activeClass = color === 'blue' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-pink-100 text-pink-700 shadow-sm';
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${active ? activeClass : 'text-slate-400 hover:text-slate-600'}`}
        >
            {label}
        </button>
    );
};

// --- Result Display Component ---
export function ResultItem({ title, icon, res }: { title: string, icon?: React.ReactNode, res: ProrationResult }) {
    if (res.buyerPaysSeller === 0 && res.sellerPaysBuyer === 0) return null;

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-blue-300 transition-colors group">
            <div className="flex justify-between items-start">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="p-1 bg-slate-200 rounded text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        {icon || <CheckCircle2 size={14} />}
                    </span>
                    {title}
                </div>
                <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                    {res.buyerPaysSeller > 0 && (
                        <div className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-xs">
                            +${money(res.buyerPaysSeller)}
                        </div>
                    )}
                    {res.sellerPaysBuyer > 0 && (
                        <div className="text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded text-xs">
                            -${money(res.sellerPaysBuyer)}
                        </div>
                    )}
                </div>
            </div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-wrap pl-8 border-l-2 border-slate-200 ml-2">
                {res.breakdown}
            </div>
        </div>
    );
}
