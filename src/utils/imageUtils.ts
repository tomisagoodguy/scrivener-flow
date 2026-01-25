/**
 * 圖片處理選項
 */
export interface ImageProcessingOptions {
    maxDimension?: number;   // 最大寬度或高度 (預設 1024)
    quality?: number;        // 壓縮品質 (0.1 ~ 1.0, 預設 0.8)
    forceWebP?: boolean;     // 是否強制轉成 WebP 格式
    enhanceForOCR?: boolean; // 是否針對 OCR 進行影像增強
    autoCrop?: boolean;      // 是否啟動智能自動裁切 (裁除背景)
}

/**
 * 黑科技縮圖、影像增強與自動裁切工具
 * 專為身分證辨識優化的頂級影像引擎
 */
export async function resizeImage(
    file: File,
    options: ImageProcessingOptions = {}
): Promise<File> {
    const {
        maxDimension = 1024,
        quality = 0.8,
        forceWebP = true,
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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return file;

        let { width, height } = image;

        // --- 1. 智能自動裁切 (Smart Crop) ---
        // 邏輯：分析圖片內容，找出含有文字/特徵的中心區域，移除無用的純色背景
        let cropCoords = { x: 0, y: 0, w: width, h: height };
        if (autoCrop && width > 400 && height > 400) {
            // 在隱藏的輔助 Canvas 上進行分析
            const analyzeCanvas = document.createElement('canvas');
            const aCtx = analyzeCanvas.getContext('2d', { willReadFrequently: true });
            if (aCtx) {
                const aSize = 200; // 縮小分析以提升速度
                analyzeCanvas.width = aSize;
                analyzeCanvas.height = Math.round(aSize * (height / width));
                aCtx.drawImage(image, 0, 0, analyzeCanvas.width, analyzeCanvas.height);

                const imgData = aCtx.getImageData(0, 0, analyzeCanvas.width, analyzeCanvas.height);
                const data = imgData.data;

                // 掃描邊緣找出內容區域 (簡單的邊緣檢測模擬)
                let minX = aSize, maxX = 0, minY = analyzeCanvas.height, maxY = 0;
                for (let y = 0; y < analyzeCanvas.height; y++) {
                    for (let x = 0; x < aSize; x++) {
                        const idx = (y * aSize + x) * 4;
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        // 這裡假設背景與身分證有明顯色差或亮度差
                        if (brightness > 40 && brightness < 240) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                // 如果偵測到有效區域 (且佔比合理)，則進行裁切
                const detectedW = maxX - minX;
                const detectedH = maxY - minY;
                if (detectedW > aSize * 0.3 && detectedH > analyzeCanvas.height * 0.3) {
                    const ratio = width / aSize;
                    const padding = 20; // 邊緣預留些許空間避免切到字
                    cropCoords.x = Math.max(0, minX * ratio - padding);
                    cropCoords.y = Math.max(0, minY * ratio - padding);
                    cropCoords.w = Math.min(width - cropCoords.x, detectedW * ratio + padding * 2);
                    cropCoords.h = Math.min(height - cropCoords.y, detectedH * ratio + padding * 2);
                }
            }
        }

        // --- 2. 縮放計算 ---
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

        // --- 3. 影像處理與增強 ---
        if (enhanceForOCR) {
            // 超強對比與銳利化濾鏡
            ctx.filter = 'grayscale(100%) contrast(180%) brightness(110%) saturate(0%)';
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 從裁切後的座標繪圖到目標畫布
        ctx.drawImage(
            image,
            cropCoords.x, cropCoords.y, cropCoords.w, cropCoords.h, // 來源裁切
            0, 0, targetW, targetH // 目標填滿
        );

        // --- 4. 輸出 ---
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
        console.error('Advanced image processing error:', error);
        return file;
    }
}
