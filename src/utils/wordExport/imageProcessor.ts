/**
 * Word 匯出 - 圖片處理工具
 * 將 HTML 中的圖片 URL 轉換為 Base64 編碼
 */

/**
 * 處理圖片：將所有圖片轉為 Base64
 */
export async function processImages(
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
