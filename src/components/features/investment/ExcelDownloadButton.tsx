'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function ExcelDownloadButton() {
    const [isExporting, setIsExporting] = useState(false);

    const handleDownload = async () => {
        if (isExporting) return;
        try {
            setIsExporting(true);
            const res = await fetch('/api/investment/export-excel');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            a.download = `etf-pool-${dateStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Excel 下載失敗:', err);
            alert(`Excel 下載失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
            title="下載選股池 Excel"
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>下載中...</span>
                </>
            ) : (
                <>
                    <Download className="w-4 h-4" />
                    <span>下載 Excel</span>
                </>
            )}
        </button>
    );
}
