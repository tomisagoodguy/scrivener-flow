'use client';

import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { buildCasesHtml, collectCaseHighlights } from '@/lib/cases/htmlExport';
import type { DemoCase } from '@/types';

interface ExportHtmlButtonProps {
    cases: DemoCase[];
    filename?: string;
}

export default function ExportHtmlButton({ cases, filename = '案件清單' }: ExportHtmlButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = () => {
        if (!cases || cases.length === 0) {
            alert('沒有案件資料可以匯出');
            return;
        }

        try {
            setIsExporting(true);

            const highlights = collectCaseHighlights(cases);
            const html = buildCasesHtml(cases, new Date(), highlights);
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
            const fullFileName = `${filename}_${dateStr}.html`;

            saveAs(blob, fullFileName);
        } catch (error: unknown) {
            console.error('HTML export failed:', error);
            const message = error instanceof Error ? error.message : '未知錯誤';
            alert(`HTML 匯出失敗: ${message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className={`
                flex items-center gap-2 px-3 py-1.5
                bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed
                text-white text-xs font-bold rounded shadow-sm transition-all
            `}
            title="下載 HTML"
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>匯出中...</span>
                </>
            ) : (
                <>
                    <Download className="w-3.5 h-3.5" />
                    <span>匯出 HTML</span>
                </>
            )}
        </button>
    );
}
