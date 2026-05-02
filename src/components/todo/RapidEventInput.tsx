'use client';

import { useState, useRef } from 'react';
import { Zap, X, Check } from 'lucide-react';
import { parseEventLine, formatPreview, ParsedEvent } from './hooks/useSmartDateParser';

interface SessionEntry {
    title: string;
    preview: string;
    caseNumber?: string;
}

interface Props {
    onAdd: (content: string, dueDate: string, endDate?: string, isAllDay?: boolean, caseNumber?: string) => Promise<void>;
    /** 常駐模式：無關閉鈕，Esc 清空輸入 */
    persistent?: boolean;
    /** 是否顯示格式提示列（預設 true） */
    showHints?: boolean;
    /** 是否顯示新增後的 session 確認列（預設 true） */
    showSession?: boolean;
    onClose?: () => void;
}

export function RapidEventInput({ onAdd, persistent = false, showHints = true, showSession = true, onClose }: Props) {
    const [input, setInput] = useState('');
    const [session, setSession] = useState<SessionEntry[]>([]);
    const [parsed, setParsed] = useState<ParsedEvent>({ title: '', startDate: null, isAllDay: false });
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (value: string) => {
        setInput(value);
        setParsed(parseEventLine(value));
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            if (persistent) {
                setInput('');
                setParsed({ title: '', startDate: null, isAllDay: false });
            } else {
                onClose?.();
            }
            return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const { title, startDate, isAllDay, caseNumber } = parsed;
        if (!title.trim()) return;

        await onAdd(
            title,
            startDate ?? new Date().toISOString(),
            undefined,
            startDate ? isAllDay : false,
            caseNumber,
        );

        const preview = formatPreview(parsed);
        setSession((prev) => [{ title, preview, caseNumber }, ...prev].slice(0, 5));
        setInput('');
        setParsed({ title: '', startDate: null, isAllDay: false });
        inputRef.current?.focus();
    };

    const preview = formatPreview(parsed);

    if (persistent) {
        return (
            <div className="border-b border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-950/30">
                {/* 輸入列 */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 dark:bg-indigo-600 shrink-0 shadow-sm">
                        <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="輸入事項 + 時間碼，按 Enter 儲存"
                        className="flex-1 text-[14px] font-medium text-slate-800 dark:text-slate-100 bg-transparent border-0 focus:outline-none placeholder:text-indigo-300 dark:placeholder:text-indigo-600"
                    />
                    {/* 案號 badge */}
                    {parsed.caseNumber && (
                        <span className="text-[11px] shrink-0 font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                            {parsed.caseNumber}
                        </span>
                    )}
                    {/* 日期 badge */}
                    {preview ? (
                        <span className="text-[12px] text-white shrink-0 font-semibold bg-indigo-500 dark:bg-indigo-600 px-2.5 py-0.5 rounded-full shadow-sm">
                            {preview}
                        </span>
                    ) : input && !parsed.caseNumber ? (
                        <span className="text-[11px] text-indigo-300 dark:text-indigo-600 shrink-0">無日期</span>
                    ) : null}
                </div>

                {/* 格式提示 */}
                {showHints && (
                    <div className="px-4 pb-2.5 flex flex-wrap gap-x-3 gap-y-1 items-center">
                        <span className="text-[10px] text-indigo-400 dark:text-indigo-500 font-medium shrink-0">格式範例：</span>
                        {[
                            { code: '協議0504', hint: '5/4全天' },
                            { code: '開會5月2日下午1點', hint: '5/2 13:00' },
                            { code: '民國115年5月6日', hint: 'ROC 全天' },
                            { code: '游建信 協議5月4日', hint: '自動綁案件' },
                        ].map(({ code, hint }) => (
                            <span key={code} className="flex items-center gap-1 text-[11px]">
                                <kbd className="font-mono bg-white dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 px-1.5 py-0.5 rounded text-[10px] shadow-sm">{code}</kbd>
                                <span className="text-indigo-400 dark:text-indigo-500">→ {hint}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Session 確認列 */}
                {showSession && session.length > 0 && (
                    <div className="px-4 pb-2.5 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-indigo-100 dark:border-indigo-800/40 pt-2">
                        {session.map((entry, i) => (
                            <span key={i} className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                                <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                {entry.caseNumber && (
                                    <span className="font-bold text-blue-500">{entry.caseNumber}</span>
                                )}
                                {entry.preview && <span className="text-indigo-400 dark:text-indigo-500">{entry.preview}</span>}
                                <span>{entry.title}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 非 persistent（摺疊模式，保留向後相容）
    return (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-500 tracking-wide uppercase">
                    <Zap className="w-3 h-3" />
                    閃電輸入
                </span>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="關閉"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>
            <div className="px-4 pb-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="事項 + 時間碼，Enter 儲存（如：開會 05021300）"
                    className="w-full text-[14px] text-slate-800 dark:text-slate-100 bg-transparent border-0 border-b-2 border-amber-400 focus:outline-none pb-1.5 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
                {preview && (
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">→ {preview}</p>
                )}
            </div>
            {session.length > 0 && (
                <div className="px-4 pb-3 space-y-0.5 max-h-32 overflow-y-auto">
                    {session.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            {entry.preview && <span className="text-slate-400 shrink-0">{entry.preview}</span>}
                            <span className="truncate">{entry.title}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/60">
                <p className="text-[10px] text-slate-300 dark:text-slate-600">
                    05021300 = 5/2 13:00 &nbsp;·&nbsp; 1150502 = 民國115年5/2 &nbsp;·&nbsp; Esc 關閉
                </p>
            </div>
        </div>
    );
}
