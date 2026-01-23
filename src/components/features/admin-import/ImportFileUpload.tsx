'use client';

import React from 'react';

interface ImportFileUploadProps {
    loading: boolean;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportFileUpload({ loading, onFileUpload }: ImportFileUploadProps) {
    return (
        <div
            className="glass-card p-12 flex flex-col items-center justify-center border-dashed border-2 border-white/40 hover:border-primary/50 transition-colors relative overflow-hidden group animate-slide-up"
            style={{ animationDelay: '0.1s' }}
        >
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={onFileUpload}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            <div className="text-center space-y-4 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-colors ${loading ? 'bg-primary/10 text-primary animate-pulse' : 'bg-slate-100 text-slate-400'}`}
                >
                    {loading ? (
                        <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    ) : (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            ></path>
                        </svg>
                    )}
                </div>
                <h3 className="text-xl font-bold text-foreground">
                    {loading ? '正在分析檔案...' : '點擊或拖曳上傳 Excel'}
                </h3>
                <p className="text-slate-500 font-medium">支援 .xlsx, .xls 格式</p>
            </div>
        </div>
    );
}
