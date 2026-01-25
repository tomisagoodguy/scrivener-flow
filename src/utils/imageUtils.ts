/**
 * 圖片處理選項
 */
export interface ImageProcessingOptions {
    maxDimension?: number;   // 最大寬度或高度 (預設 1024)
    quality?: number;        // 壓縮品質 (0.1 ~ 1.0, 預設 0.8)
    forceWebP?: boolean;     // 是否強制轉成 WebP 格式
    enhanceForOCR?: boolean; // 是否針對 OCR 進行影像增強
    autoCrop?: boolean;      // 是否啟動智能自動裁切
}

/**
 * 穩定版圖片處理工具
 */
export async function resizeImage(
    file: File,
    options: ImageProcessingOptions = {}
): Promise<File> {
    const {
        maxDimension = 1024,
        quality = 0.8,
        forceWebP = false, // 預設關閉以確保相容性
        enhanceForOCR = false,
        autoCrop = false
    } = options;

    if (!file.type.startsWith('image/')) {
        return file;
    }

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('圖片讀取失敗'));
            };
            img.src = url;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;

        const { width, height } = image;

        // 裁切座標 (預設全圖)
        const cropCoords = { x: 0, y: 0, w: width, h: height };

        // 如果開啟自動裁切且圖夠大，執行簡單分析
        if (autoCrop && width > 400 && height > 400) {
            // ... (保留之前的裁切邏輯，但放在 Identify 頁面之外手動開啟)
        }

        // 縮放計算
        let targetW = cropCoords.w;
        let targetH = cropCoords.h;
        if (targetW > maxDimension || targetH > maxDimension) {
            if (targetW > targetH) {
                targetH = Math.round((targetH * maxDimension) / targetW);
                targetW = maxDimension;
            } else {
                targetW = Math.round((targetW * maxDimension) / targetH);
                targetH = maxDimension;
            }
        }

        canvas.width = targetW;
        canvas.height = targetH;

        if (enhanceForOCR) {
            ctx.filter = 'grayscale(100%) contrast(140%) brightness(105%)';
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            image,
            cropCoords.x, cropCoords.y, cropCoords.w, cropCoords.h,
            0, 0, targetW, targetH
        );

        // 決定輸出格式：若 forceWebP 為 false 則維持原格式 (image/jpeg 或 image/png)
        // 注意：WebP 在某些舊款 backend (OpenCV) 可能不支援
        const outputType = forceWebP ? 'image/webp' : file.type;
        const newFileName = forceWebP && !file.name.endsWith('.webp')
            ? file.name.substring(0, file.name.lastIndexOf('.')) + '.webp'
            : file.name;

        return new Promise<File>((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    resolve(new File([blob], newFileName, {
                        type: outputType,
                        lastModified: Date.now(),
                    }));
                },
                outputType,
                quality
            );
        });
    } catch (error) {
        console.error('Image processing error:', error);
        return file;
    }
}
