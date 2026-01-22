'use client';

import Link from 'next/link';
import { useNewCaseForm } from '@/components/features/cases/new-case/useNewCaseForm';
import { useDocxUpload } from '@/components/features/cases/new-case/useDocxUpload';
import { BasicInfoSection } from '@/components/features/cases/new-case/BasicInfoSection';
import { InvolvedPartiesSection } from '@/components/features/cases/new-case/InvolvedPartiesSection';
import { DatesAndPaymentsSection } from '@/components/features/cases/new-case/DatesAndPaymentsSection';
import { NotesSection } from '@/components/features/cases/new-case/NotesSection';

export default function NewCasePage() {
    const {
        formData,
        setFormData,
        errorMsg,
        isDuplicate,
        isChecking,
        suggestedNum,
        loading,
        handleChange,
        checkDuplicate,
        handleSubmit,
    } = useNewCaseForm();

    const { loading: docxLoading, handleFileUpload } = useDocxUpload(setFormData, checkDuplicate);

    const isLoading = loading || docxLoading;

    return (
        <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">新增案件</h1>
                    <p className="text-foreground/50 font-bold mt-2">Create New Case Process</p>
                </div>
                <div className="flex gap-4">
                    <label className="bg-primary hover:bg-primary-deep text-white px-4 py-2 rounded-full cursor-pointer transition-colors text-sm flex items-center gap-2 shadow-sm font-bold">
                        <span>📄 重新讀取案件單 (.docx)</span>
                        <input
                            type="file"
                            accept=".docx"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isLoading}
                        />
                    </label>
                    <Link
                        href="/"
                        className="bg-card border border-border px-6 py-2 rounded-full hover:bg-secondary transition-colors text-foreground text-sm flex items-center shadow-sm font-bold"
                    >
                        ← 返回列表
                    </Link>
                </div>
            </header>

            <form
                onSubmit={handleSubmit}
                className="glass-card p-6 md:p-10 animate-slide-up space-y-8 border border-card-border overflow-hidden"
            >
                <BasicInfoSection
                    formData={formData}
                    handleChange={handleChange}
                    setFormData={setFormData}
                    isDuplicate={isDuplicate}
                    isChecking={isChecking}
                    suggestedNum={suggestedNum}
                />

                <InvolvedPartiesSection
                    formData={formData}
                    handleChange={handleChange}
                />

                <div className="border-t border-gray-200"></div>

                <DatesAndPaymentsSection
                    formData={formData}
                    handleChange={handleChange}
                />

                <div className="border-t border-gray-200"></div>

                <NotesSection
                    formData={formData}
                    handleChange={handleChange}
                    setFormData={setFormData}
                />

                <div className="pt-6 flex flex-col md:flex-row items-center justify-end gap-6">
                    {/* DEBUG ERROR DISPLAY */}
                    {errorMsg && (
                        <div className="flex-1 bg-red-500/10 border-l-4 border-red-500 text-red-500 p-4 rounded font-mono text-sm">
                            <p className="font-black mb-1">發生錯誤：</p>
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex gap-4 w-full md:w-auto">
                        <Link
                            href="/"
                            className="px-8 py-4 bg-secondary/50 text-foreground font-bold rounded-2xl hover:bg-secondary transition-all border border-border flex items-center justify-center"
                        >
                            取消
                        </Link>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 md:flex-none md:min-w-[200px] bg-primary hover:bg-primary-deep text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-100 flex items-center justify-center gap-2 text-lg"
                        >
                            {isLoading ? '儲存中...' : '🚀 建立案件 (Save Case)'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
