'use client';

import React, { useState, useRef } from 'react';
import { DriveFile, GoogleDriveService } from '@/lib/google/drive';
import { Upload, File, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { resizeImage } from '@/utils/imageUtils';

interface GoogleDriveUploadProps {
    caseId?: string;
    caseNumber?: string;
    onUploadComplete?: (file: DriveFile) => void;
}

export default function GoogleDriveUpload({ caseId, caseNumber, onUploadComplete }: GoogleDriveUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<DriveFile[]>([]);
    const [showModal, setShowModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Resize images before uploading (WebP is default)
            if (file.type.startsWith('image/')) {
                file = await resizeImage(file, { maxDimension: 1024 });
            }

            const isSmallFile = file.size < 4 * 1024 * 1024; // 4MB Limit for Vercel Serverless

            if (isSmallFile) {
                // === 模式 A: E2EE 加密通道 (小檔案) ===
                toast.info('啟動 E2EE 加密傳輸通道...', { description: '檔案將透過隱密通道傳送，全程加密' });

                // 1. 讀取檔案為 Base64
                const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });

                const dataUrl = await toBase64(file);
                const base64Content = dataUrl.split(',')[1];

                // 2. 使用 SecureApi 發送加密請求
                const { SecureApi } = await import('@/lib/crypto/secureApi');
                const res = await SecureApi.post<any>('/api/drive/secure-upload', {
                    fileName: file.name,
                    fileType: file.type,
                    fileContentBase64: base64Content,
                    caseId,
                    caseNumber
                });

                if (res.success) {
                    setUploadedFiles(prev => [...prev, res.data]);
                    toast.success(`檔案 ${file.name} 安全上傳成功！`);
                    if (onUploadComplete) onUploadComplete(res.data);
                } else {
                    throw new Error(res.error || '上傳失敗');
                }

            } else {
                // === 模式 B: 直連加密通道 (大檔案) ===
                toast.info('檔案較大 (>4MB)，切換至直連通道...', { description: '正在建立安全連線，請稍候' });

                // 1. 取得目標資料夾 ID (自動判斷結構)
                const folderId = await GoogleDriveService.getCaseFolderId(caseId, caseNumber);

                // 2. 直連上傳 Google Drive
                const tempFile = await GoogleDriveService.uploadFile(file, folderId);

                // 3. 取得完整檔案資訊 (包含 webViewLink)
                const fullFile = await GoogleDriveService.getFileDetails(tempFile.id);

                setUploadedFiles(prev => [...prev, fullFile]);
                toast.success(`檔案 ${file.name} 上傳成功！`);
                if (onUploadComplete) onUploadComplete(fullFile);
            }

        } catch (error: any) {
            console.error('Upload Error:', error);
            toast.error(error.message || '連線失敗');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="relative">
            {/* 1. 平常顯示的低調 Icon */}
            {!showModal && (
                <div className="flex flex-col items-center gap-2 w-fit group/gdrive">
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover/gdrive:scale-110 transition-transform active:scale-95"
                    >
                        <span className="text-white font-black text-xl">S</span>
                    </button>
                </div>
            )}

            {/* 2. 點擊後跳出的模態視窗 */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                        <span className="text-white font-black text-xl">S</span>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">雲端附件庫</h3>
                                        <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Google Drive Direct Channel</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                                >
                                    <Trash2 className="w-5 h-5 rotate-45" /> {/* 旋轉用來當關閉按鈕 */}
                                </button>
                            </div>

                            <div className="space-y-6">
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl text-sm font-black transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                    <span>{uploading ? '傳輸至雲端中...' : '上傳新附件'}</span>
                                </button>

                                {/* 檔案列表 */}
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {uploadedFiles.length === 0 ? (
                                        <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 gap-3">
                                            <File className="w-10 h-10 opacity-10" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">目前此案件無附件</span>
                                        </div>
                                    ) : (
                                        uploadedFiles.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:border-blue-400/50 transition-all"
                                            >
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    {file.iconLink ? (
                                                        <img src={file.iconLink} alt="" className="w-5 h-5" />
                                                    ) : (
                                                        <File className="w-5 h-5 text-slate-400" />
                                                    )}
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                                        {file.name}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={file.webViewLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                                                        title="在新分頁開啟"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                                                        className="p-2 hover:bg-white dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm"
                                                        title="從清單移除"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30">
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed text-center italic">
                                    Secure Smart Routing: E2EE (Small) / Direct SSL (Large) Active
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
