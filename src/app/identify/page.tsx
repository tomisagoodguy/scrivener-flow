'use client';

import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { useIdentifyUpload, ParsedPerson } from '@/hooks/useIdentifyUpload';

const getConfidenceMeta = (score?: number) => {
    if (score === undefined) return null;
    if (score >= 0.9) return { text: '高信心度', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    if (score >= 0.7) return { text: '需檢查', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' };
    return { text: '低信心度', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
};

function CopyableField({ label, value }: { label: string; value: string | null }) {
    const copy = () => { if (value) navigator.clipboard.writeText(value); };
    return (
        <div className="space-y-1 group">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
            <div onClick={copy} className="font-bold text-lg text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2" title="點擊複製">
                {value || <span className="text-slate-300 italic">未偵測到</span>}
                {value && <span className="text-xs opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">複製</span>}
            </div>
        </div>
    );
}

function PersonCard({ person }: { person: ParsedPerson }) {
    const conf = getConfidenceMeta(person.confidence);
    const copy = (val: string | null) => { if (val) navigator.clipboard.writeText(val); };
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {conf && (
                <div className={`px-4 py-2 text-xs font-bold text-right ${conf.color}`}>
                    {conf.text} ({Math.round((person.confidence || 0) * 100)}%)
                </div>
            )}
            <div className="p-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-1 group">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">姓名</label>
                    <div onClick={() => copy(person.name)} className="font-black text-2xl text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2" title="點擊複製">
                        {person.name || <span className="text-slate-300 italic">未偵測到</span>}
                        {person.name && <span className="text-xs opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">複製</span>}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">統一編號</label>
                    <div onClick={() => copy(person.id_number)} className="font-mono font-bold text-xl text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2" title="點擊複製">
                        {person.id_number || <span className="text-slate-300 italic">未偵測到</span>}
                        {person.id_number && <span className="text-xs opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">複製</span>}
                    </div>
                </div>
                <CopyableField label="出生年月日" value={person.dob} />
                <div className="md:col-span-2"><CopyableField label="住址" value={person.address} /></div>
            </div>
        </div>
    );
}

export default function IdentifyPage() {
    const {
        files, setFiles, removeFile, onDrop,
        isUploading, results, error,
        progress, stageText, elapsedTime, finalDuration,
        handleUpload,
    } = useIdentifyUpload();

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': [], 'image/png': [], 'application/pdf': [] },
        maxFiles: 10,
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center relative">
                    <Link href="/" className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 font-bold">
                        <span className="text-xl">🏠</span>
                        <span className="hidden sm:inline">回首頁</span>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">身分證智能辨識</h1>
                    <p className="text-slate-600 dark:text-slate-400">上傳身分證圖檔或 PDF，快速提取關鍵欄位</p>
                </div>

                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 min-h-[300px] ${
                        isDragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl'
                    }`}
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
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate pr-6">{f.name}</p>
                                            <p className="text-xs text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                            {isUploading ? (
                                <div className="w-full mt-6 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-blue-600 dark:text-blue-400 px-1">
                                        <span className="animate-pulse">{stageText}</span>
                                        <div className="flex gap-3"><span>⏱️ {elapsedTime}s</span><span>{progress}%</span></div>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-linear-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                    className="w-full sm:w-auto mt-4 px-10 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 bg-linear-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/50 transition-all hover:-translate-y-1 active:translate-y-0"
                                >
                                    開始批量辨識 ({files.length})
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xl font-bold text-slate-700 dark:text-slate-200">點擊或拖放多個檔案至此</p>
                            <p className="text-slate-500 dark:text-slate-400">支援 JPG, PNG, PDF 格式 (可批量處理)</p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-center font-bold">
                        {error}
                    </div>
                )}

                {results && results.length === 0 && !error && (
                    <div className="p-8 text-center bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800">
                        <div className="text-4xl mb-3">🤔</div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-amber-100 mb-2">無法識別出任何身分證資料</h3>
                        <p className="text-sm text-slate-600 dark:text-amber-200/80">請確認圖片清晰、光線充足，且包含完整的「姓名」或「身分證字號」欄位試試看。</p>
                    </div>
                )}

                {results && results.length > 0 && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">辨識結果 ({results.length} 筆)</h2>
                            {finalDuration && (
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                    ⚡ 總耗時: {finalDuration.toFixed(1)} 秒
                                </span>
                            )}
                        </div>
                        {results.map((person, index) => <PersonCard key={index} person={person} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
