'use client';

import { useState } from 'react';
import { asBlob } from 'html-docx-js/dist/html-docx';
import { saveAs } from 'file-saver';
import { processImages } from '@/utils/wordExport/imageProcessor';
import { assembleFullHtml } from '@/utils/wordExport/htmlAssembler';
import { sanitizeFilename, getDateString, convertTaskLists } from '@/utils/wordExport/fileUtils';

interface ExportOptions {
    title: string;
    htmlContent: string;
}

interface ExportResult {
    success: boolean;
    error?: string;
}

/**
 * useWordExport Hook
 * 將富文本 HTML 內容匯出為 Word 文件 (.docx)
 */
export function useWordExport() {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    /**
     * 核心匯出函式
     */
    const exportToWord = async ({
        title,
        htmlContent,
    }: ExportOptions): Promise<ExportResult> => {
        setIsExporting(true);
        setError(null);
        setProgress(0);

        try {
            // 1. 預處理 HTML：轉換待辦清單
            let processedHtml = convertTaskLists(htmlContent);
            setProgress(20);

            // 2. 處理圖片：轉換為 Base64
            processedHtml = await processImages(processedHtml, setProgress);
            setProgress(70);

            // 3. 組裝完整 HTML 文件（含樣式）
            const fullHtml = assembleFullHtml(title, processedHtml);
            setProgress(80);

            // 4. 轉換為 DOCX Blob
            const blob = asBlob(fullHtml);
            if (!blob) {
                throw new Error('DOCX 轉換失敗：無法生成 Blob');
            }
            setProgress(90);

            // 5. 觸發下載
            const filename = `${sanitizeFilename(title)}_${getDateString()}.docx`;
            saveAs(blob, filename);
            setProgress(100);

            return { success: true };
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : '未知錯誤';
            setError(errorMsg);
            console.error('Word Export Error:', err);
            return { success: false, error: errorMsg };
        } finally {
            setIsExporting(false);
            setTimeout(() => setProgress(0), 1000); // 重置進度
        }
    };

    return { exportToWord, isExporting, error, progress };
}
