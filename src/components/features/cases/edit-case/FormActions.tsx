'use client';

import React from 'react';
import Link from 'next/link';

interface FormActionsProps {
    loading: boolean;
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: (show: boolean) => void;
    performDelete: () => void;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    lastSaved: Date | null;
}

export const FormActions: React.FC<FormActionsProps> = ({
    loading,
    showDeleteConfirm,
    setShowDeleteConfirm,
    performDelete,
    saveStatus,
    lastSaved
}) => {
    return (
        <div className="pt-8 flex flex-col md:flex-row justify-between gap-6 md:gap-4">
            <div className="flex flex-col gap-2 w-full md:w-auto order-2 md:order-1">
                {showDeleteConfirm ? (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-bold"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            onClick={performDelete}
                            disabled={loading}
                            className="flex-1 md:flex-none px-6 py-2 rounded-lg bg-red-600 text-white text-sm font-black shadow-lg shadow-red-500/30 active:scale-95"
                        >
                            {loading ? '處理中...' : '確認刪除'}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={loading}
                        className="w-full md:w-auto px-6 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold border border-red-100 flex items-center justify-center gap-2"
                    >
                        🗑️ 刪除案件
                    </button>
                )}
            </div>

            <div className="flex flex-col items-end gap-1">
                <div className="flex gap-4">
                    <Link
                        href="/cases"
                        className="flex-1 md:flex-none px-6 py-3 rounded-xl hover:bg-secondary transition-all text-sm font-bold border border-transparent flex items-center justify-center"
                    >
                        取消編輯
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 md:flex-none bg-primary hover:bg-primary-deep text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex justify-center"
                    >
                        {loading ? '儲存中...' : '✅ 儲存並返回'}
                    </button>
                </div>
                {saveStatus !== 'idle' && (
                    <span className={`text-[10px] font-bold flex items-center gap-1 animate-fade-in ${saveStatus === 'saving' ? 'text-blue-500' :
                        saveStatus === 'saved' ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {saveStatus === 'saving' && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                        {saveStatus === 'saved' && '✓ 已自動儲存'}
                        {saveStatus === 'saving' && '正在自動備份...'}
                        {saveStatus === 'error' && '⚠ 自動存檔失敗'}
                        {saveStatus === 'saved' && lastSaved && ` (${lastSaved.toLocaleTimeString()})`}
                    </span>
                )}
            </div>
        </div>
    );
};
