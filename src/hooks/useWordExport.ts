'use client';

import { useState } from 'react';
import { asBlob } from 'html-docx-js/dist/html-docx';
import { saveAs } from 'file-saver';

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
        } catch (err: any) {
            const errorMsg = err.message || '未知錯誤';
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

// ============= Helper Functions =============

/**
 * 清理檔名：移除非法字元並限制長度
 */
function sanitizeFilename(name: string): string {
    return name
        .replace(/[<>:"/\\|?*]/g, '_') // 移除 Windows 非法字元
        .replace(/\s+/g, '_') // 空格轉底線
        .substring(0, 100); // 限制長度
}

/**
 * 取得當前日期字串 (YYYY-MM-DD)
 */
function getDateString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * 轉換待辦清單為勾選框符號
 */
function convertTaskLists(html: string): string {
    // Tiptap TaskList 格式：<li data-checked="true">...</li>
    html = html.replace(
        /<li data-checked="true">/g,
        '<li style="list-style: none;">☑ '
    );
    html = html.replace(
        /<li data-checked="false">/g,
        '<li style="list-style: none;">☐ '
    );
    return html;
}

/**
 * 處理圖片：將所有圖片轉為 Base64
 */
async function processImages(
    html: string,
    setProgress?: (p: number) => void
): Promise<string> {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const matches = [...html.matchAll(imgRegex)];

    if (matches.length === 0) return html;

    let processedHtml = html;
    const totalImages = matches.length;

    for (let i = 0; i < matches.length; i++) {
        const originalSrc = matches[i][1];

        try {
            // Base64 圖片：保持不變
            if (originalSrc.startsWith('data:image')) {
                continue;
            }

            // Google Drive URL
            if (
                originalSrc.includes('drive.google.com') ||
                originalSrc.includes('/api/drive/view/')
            ) {
                const base64 = await fetchGoogleDriveImage(originalSrc);
                if (base64) {
                    processedHtml = processedHtml.replace(originalSrc, base64);
                }
            }
            // 外部 URL
            else {
                const base64 = await fetchExternalImage(originalSrc);
                if (base64) {
                    processedHtml = processedHtml.replace(originalSrc, base64);
                }
            }

            // 更新進度 (20% ~ 70%)
            if (setProgress) {
                const imageProgress = 20 + ((i + 1) / totalImages) * 50;
                setProgress(Math.round(imageProgress));
            }
        } catch (err) {
            console.warn(`圖片處理失敗 (保留原始 URL): ${originalSrc}`, err);
            // 失敗時保留原始 URL，不中斷匯出
        }
    }

    return processedHtml;
}

/**
 * 下載 Google Drive 圖片並轉為 Base64
 */
async function fetchGoogleDriveImage(url: string): Promise<string | null> {
    try {
        // 提取 fileId
        const fileIdMatch = url.match(/[-\w]{25,}/);
        if (!fileIdMatch) {
            console.warn('無法解析 Google Drive URL:', url);
            return null;
        }

        const fileId = fileIdMatch[0];
        const proxyUrl = `/api/drive/view/${fileId}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        // 可選：壓縮圖片
        return await compressImage(base64);
    } catch (err) {
        console.warn('Google Drive 圖片下載失敗:', err);
        return null;
    }
}

/**
 * 下載外部圖片並轉為 Base64
 */
async function fetchExternalImage(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return null;

        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        // 可選：壓縮圖片
        return await compressImage(base64);
    } catch (err) {
        console.warn('外部圖片下載失敗 (可能 CORS 限制):', url, err);
        return null;
    }
}

/**
 * Blob 轉 Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 壓縮圖片（限制寬度為 1200px）
 */
async function compressImage(
    base64: string,
    maxWidth = 1200,
    quality = 0.85
): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // 如果圖片已經夠小，不壓縮
            if (img.width <= maxWidth) {
                resolve(base64);
                return;
            }

            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64); // 失敗時回傳原圖
        img.src = base64;
    });
}

/**
 * 組裝完整 HTML 文件（含樣式）
 */
function assembleFullHtml(title: string, bodyContent: string): string {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Microsoft JhengHei', '微軟正黑體', 'Arial', sans-serif; 
            line-height: 1.6;
            color: #1f2937;
          }
          h1 { 
            color: #1e3a8a; 
            font-size: 24pt; 
            font-weight: bold;
            margin-bottom: 8pt;
          }
          h2 { 
            color: #2563eb; 
            font-size: 18pt; 
            font-weight: bold;
            margin-top: 12pt;
            margin-bottom: 6pt;
          }
          h3 { 
            color: #3b82f6; 
            font-size: 14pt; 
            font-weight: bold;
            margin-top: 8pt;
            margin-bottom: 4pt;
          }
          p {
            margin: 6pt 0;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 12pt 0;
          }
          td, th { 
            border: 1px solid #d1d5db; 
            padding: 8px; 
            vertical-align: top;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          img { 
            max-width: 100%; 
            height: auto; 
            display: block;
            margin: 12pt 0;
          }
          strong, b { 
            font-weight: bold; 
          }
          em, i { 
            font-style: italic; 
          }
          u { 
            text-decoration: underline; 
          }
          ul, ol {
            margin: 6pt 0;
            padding-left: 24pt;
          }
          li {
            margin: 3pt 0;
          }
          a {
            color: #2563eb;
            text-decoration: underline;
          }
          hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 16pt 0;
          }
          code {
            font-family: 'Courier New', monospace;
            background-color: #f3f4f6;
            padding: 2px 4px;
            border-radius: 3px;
          }
          pre {
            background-color: #f3f4f6;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
          }
          blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 12pt;
            margin-left: 0;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <hr />
        ${bodyContent}
        <hr />
        <p style="color: #9ca3af; font-size: 9pt; margin-top: 24pt;">
          匯出日期：${new Date().toLocaleString('zh-TW')} | 由 ScrivenerFlow 系統生成
        </p>
      </body>
    </html>
  `;
}

/**
 * 轉義 HTML 特殊字元
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
