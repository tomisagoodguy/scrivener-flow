/**
 * 壓縮並調整圖片大小 (Resize)
 * @param file 原始圖片檔案
 * @param maxDimension 最大寬度或高度 (預設 1024)
 * @param quality 壓縮品質 (0.1 ~ 1.0, 預設 0.8)
 * @returns 處理後的 File 物件
 */
export async function resizeImage(
    file: File,
    maxDimension: number = 1024,
    quality: number = 0.8
): Promise<File> {
    // 1. 基本檢查：唯有圖片才處理
    if (!file.type.startsWith('image/')) {
        return file;
    }

    try {
        // 2. 建立圖片物件
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

        // 3. 計算新維度 (維持比例)
        let { width, height } = image;

        // 如果已經在範圍內，不縮放直接回傳原檔
        if (width <= maxDimension && height <= maxDimension) {
            return file;
        }

        if (width > height) {
            if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        // 4. 使用 Canvas 進行重繪
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) return file;

        // 優化繪圖品質
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);

        // 5. 輸出為 Blob 並封裝成 File
        return new Promise<File>((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    // 將 Blob 轉回 File 以保持檔名
                    const resizedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now(),
                    });
                    resolve(resizedFile);
                },
                file.type,
                quality
            );
        });
    } catch (error) {
        console.error('Resize image error:', error);
        return file; // 發生任何錯誤都回傳原檔，確保上傳不中斷
    }
}
