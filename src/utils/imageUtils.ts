/**
 * 圖片處理選項
 */
export interface ImageProcessingOptions {
    maxDimension?: number;   // 最大寬度或高度 (預設 1024)
    quality?: number;        // 壓縮品質 (0.1 ~ 1.0, 預設 0.8)
    forceWebP?: boolean;     // 是否強制轉成 WebP 格式 (體積更小)
    enhanceForOCR?: boolean; // 是否針對 OCR 進行影像增強 (對比、灰階)
}

/**
 * 黑科技縮圖與影像增強工具
 * 結合 WebP 壓縮與 OCR 亮點優化技術
 */
export async function resizeImage(
    file: File,
    options: ImageProcessingOptions = {}
): Promise<File> {
    const {
        maxDimension = 1024,
        quality = 0.8,
        forceWebP = true,
        enhanceForOCR = false
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

        let { width, height } = image;

        // 縮放計算
        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) return file;

        // --- 影像增強技術 (OCR 專用) ---
        if (enhanceForOCR) {
            // 使用 CSS 濾鏡等級的 Canvas 優化
            // grayscale: 轉灰階去色雜訊
            // contrast: 提高對比，讓文字與背景更分明
            // brightness: 微調亮度避免暗處無法辨識
            ctx.filter = 'grayscale(100%) contrast(150%) brightness(105%)';
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);

        // 決定輸出格式與副檔名
        const outputType = forceWebP ? 'image/webp' : file.type;
        const extension = forceWebP ? '.webp' : (file.name.substring(file.name.lastIndexOf('.')) || '');
        const newFileName = file.name.substring(0, file.name.lastIndexOf('.')) + (forceWebP ? '.webp' : extension);

        return new Promise<File>((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const processedFile = new File([blob], newFileName, {
                        type: outputType,
                        lastModified: Date.now(),
                    });

                    // 如果處理後反而變大（極罕見），則回傳原檔
                    if (processedFile.size > file.size && !enhanceForOCR && !forceWebP) {
                        resolve(file);
                    } else {
                        resolve(processedFile);
                    }
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
