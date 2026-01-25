'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { resizeImage } from '@/utils/imageUtils';

type ParsedPerson = {
    name: string | null;
    dob: string | null;
    id_number: string | null;
    address: string | null;
    confidence?: number;
};

// Simulated progress stages
const LOADING_STAGES = [
    { progress: 10, text: '☁️ 正在上傳檔案...' },
    { progress: 30, text: '🤖 啟動 AI 辨識引擎 (此過程需時較長)...' },
    { progress: 60, text: '🔍 正在分析證件細節...' },
    { progress: 85, text: '✍️ 正在擷取文字資料...' },
    { progress: 95, text: '✨ 即將完成...' },
];

// Helper for confidence badge
const getConfidenceMeta = (score?: number) => {
    if (score === undefined) return null;
    if (score >= 0.9) return { text: '高信心度', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    if (score >= 0.7) return { text: '需檢查', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' };
    return { text: '低信心度', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
};

export default function IdentifyPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<ParsedPerson[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Progress state
    const [progress, setProgress] = useState(0);
    const [stageText, setStageText] = useState('');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFiles(acceptedFiles);
            setResults(null);
            setError(null);
        }
    }, []);

    // Simulated progress timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isUploading) {
            let currentStage = 0;
            setProgress(LOADING_STAGES[0].progress);
            setStageText(LOADING_STAGES[0].text);

            interval = setInterval(() => {
                currentStage++;
                if (currentStage < LOADING_STAGES.length) {
                    setProgress(LOADING_STAGES[currentStage].progress);
                    setStageText(LOADING_STAGES[currentStage].text);
                }
            }, 3000); // Advance stage every 3 seconds
        } else {
            setProgress(0);
        }
        return () => clearInterval(interval);
    }, [isUploading]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'application/pdf': []
        },
        maxFiles: 10
    });

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);
        setResults(null);

        try {
            // Resize images before uploading
            const processedFiles = await Promise.all(
                files.map(file => file.type.startsWith('image/') ? resizeImage(file, 1024) : file)
            );

            const formData = new FormData();
            processedFiles.forEach(file => {
                formData.append('file', file);
            });

            const response = await fetch('/api/identify', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            if (data.success && data.data) {
                setResults(data.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || '發生錯誤，請重試');
        } finally {
            setIsUploading(false);
        }
    };

    const copyToClipboard = (text: string | null) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        // You could add a toast notification here
        alert(`已複製: ${text}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center relative">
                    <Link
                        href="/"
                        className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 font-bold"
                    >
                        <span className="text-xl">🏠</span>
                        <span className="hidden sm:inline">回首頁</span>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                        身分證智能辨識
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        上傳身分證圖檔或 PDF，快速提取關鍵欄位
                    </p>
                </div>

                {/* Upload Area */}
                <div
                    {...getRootProps()}
                    className={`
                        border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300
                        flex flex-col items-center justify-center gap-4 min-h-[300px]
                        ${isDragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl'
                        }
                    `}
                >
                    <input {...getInputProps()} />
                    <div className="text-6xl mb-4">🪪</div>
                    {files.length > 0 ? (
                        <div className="space-y-4 w-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                {files.map((f, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-3 group relative">
                                        <div className="text-2xl">📄</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate pr-6">
                                                {f.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {(f.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Stop dropzone from opening
                                                const newFiles = [...files];
                                                newFiles.splice(idx, 1);
                                                setFiles(newFiles);
                                            }}
                                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                                            title="移除檔案"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {isUploading ? (
                                <div className="w-full mt-6 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-blue-600 dark:text-blue-400 px-1">
                                        <span className="animate-pulse">{stageText}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpload();
                                    }}
                                    className="w-full sm:w-auto mt-4 px-10 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/50 transition-all hover:-translate-y-1 active:translate-y-0"
                                >
                                    開始批量辨識 ({files.length})
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
                                點擊或拖放多個檔案至此
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                                支援 JPG, PNG, PDF 格式 (可批量處理)
                            </p>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-center font-bold">
                        {error}
                    </div>
                )}

                {/* Empty State after search */}
                {results && results.length === 0 && !error && (
                    <div className="p-8 text-center bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800">
                        <div className="text-4xl mb-3">🤔</div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-amber-100 mb-2">無法識別出任何身分證資料</h3>
                        <p className="text-sm text-slate-600 dark:text-amber-200/80">
                            請確認圖片清晰、光線充足，且包含完整的「姓名」或「身分證字號」欄位試試看。
                        </p>
                    </div>
                )}

                {/* Results Area */}
                {results && results.length > 0 && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                辨識結果 ({results.length} 筆)
                            </h2>
                        </div>

                        {results.map((person, index) => {
                            const conf = getConfidenceMeta(person.confidence);
                            return (
                                <div
                                    key={index}
                                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                                >
                                    {/* Card Header with Confidence */}
                                    {conf && (
                                        <div className={`px-4 py-2 text-xs font-bold text-right ${conf.color}`}>
                                            {conf.text} ({Math.round((person.confidence || 0) * 100)}%)
                                        </div>
                                    )}
                                    <div className="p-6 grid gap-6 md:grid-cols-2">
                                        {/* Name */}
                                        <div className="space-y-1 group">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">姓名</label>
                                            <div
                                                onClick={() => copyToClipboard(person.name)}
                                                className="font-black text-2xl text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                                                title="點擊複製"
                                            >
                                                {person.name || <span className="text-slate-300 italic">未偵測到</span>}
                                                {person.name && <span className="text-xs opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">複製</span>}
                                            </div>
                                        </div>

                                        {/* ID Number */}
                                        <div className="space-y-1 group">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">統一編號</label>
                                            <div
                                                onClick={() => copyToClipboard(person.id_number)}
                                                className="font-mono font-bold text-xl text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                                                title="點擊複製"
                                            >
                                                {person.id_number || <span className="text-slate-300 italic">未偵測到</span>}
                                                {person.id_number && <span className="text-xs opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">複製</span>}
                                            </div>
                                        </div>

                                        {/* DOB */}
                                        <div className="space-y-1 group">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">出生年月日</label>
                                            <div
                                                onClick={() => copyToClipboard(person.dob)}
                                                className="font-bold text-lg text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                                                title="點擊複製"
                                            >
                                                {person.dob || <span className="text-slate-300 italic">未偵測到</span>}
                                                {person.dob && <span className="text-xs opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">複製</span>}
                                            </div>
                                        </div>

                                        {/* Address */}
                                        <div className="md:col-span-2 space-y-1 group">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">住址</label>
                                            <div
                                                onClick={() => copyToClipboard(person.address)}
                                                className="font-bold text-lg text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                                                title="點擊複製"
                                            >
                                                {person.address || <span className="text-slate-300 italic">未偵測到</span>}
                                                {person.address && <span className="text-xs opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">複製</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
