import React from 'react';
import { Plus } from 'lucide-react';

interface ScheduleInputProps {
    date: string;
    setDate: (val: string) => void;
    time: string;
    setTime: (val: string) => void;
    content: string;
    setContent: (val: string) => void;
    isSubmitting: boolean;
    handleAdd: (e: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => void;
}

export function ScheduleInput({
    date, setDate,
    time, setTime,
    content, setContent,
    isSubmitting,
    handleAdd
}: ScheduleInputProps) {
    return (
        <div
            className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(e)}
        >
            <div className="flex flex-col md:flex-row gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-400">日期</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-400">時間 (選填)</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                </div>
                <div className="space-y-1 grow">
                    <label className="text-xs font-bold text-indigo-400">行程內容 / 備忘</label>
                    <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="例如:下午 2 點與代書確認..."
                        className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm transition-colors"
                    >
                        <Plus size={16} />
                        新增
                    </button>
                </div>
            </div>
        </div>
    );
}
