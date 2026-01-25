import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import { uploadToDrive } from '@/app/actions/googleDrive';
import { resizeImage } from '@/utils/imageUtils';

export async function uploadImageAndInsert(file: File, editor: Editor | null) {
    if (!editor) return;

    if (!file.type.startsWith('image/') && !file.type.includes('pdf') && !file.type.includes('word')) {
        toast.error('不支援的檔案格式');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        toast.error('檔案太大 (限 10MB)');
        return;
    }

    const toastId = toast.loading(`正在上傳 ${file.name}...`);

    try {
        // Resize images if it's an image (WebP is default)
        const processedFile = file.type.startsWith('image/')
            ? await resizeImage(file, { maxDimension: 1024 })
            : file;

        const result = await uploadToDrive(processedFile, 'ScrivenerFlow_Attachments');

        if (result.success && result.data) {
            const driveFile = result.data;
            const fileId = driveFile.id;

            if (file.type.startsWith('image/')) {
                const proxyUrl = `/api/drive/view/${fileId}`;
                editor.chain().focus().setImage({
                    src: proxyUrl,
                    alt: file.name
                }).run();
                toast.success('圖片已嵌入', { id: toastId });
            } else {
                const driveLink = driveFile.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
                editor.chain().focus().insertContent(` <a href="${driveLink}" target="_blank" rel="noopener noreferrer">附件: ${file.name}</a> `).run();
                toast.success('檔案連結已插入', { id: toastId });
            }
        } else {
            toast.error(result.error || '上傳失敗', { id: toastId });
        }
    } catch (error) {
        console.error('Upload error:', error);
        toast.error('上傳過程中發生錯誤', { id: toastId });
    }
}

export function useImageUpload(editor: Editor | null) {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (file: File) => {
        setIsUploading(true);
        await uploadImageAndInsert(file, editor);
        setIsUploading(false);
    };

    return {
        isUploading,
        handleUpload
    };
}
