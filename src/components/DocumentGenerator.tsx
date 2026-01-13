'use client';

import { useState } from 'react';
import { generateDocument } from '@/app/actions/generateDoc';

interface DocumentGeneratorProps {
    caseId: string;
}

export default function DocumentGenerator({ caseId }: DocumentGeneratorProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async (type: 'contract_summary') => {
        setIsLoading(true);
        try {
            const result = await generateDocument(caseId, type);

            if (result.status === 'success' && result.fileBase64) {
                // Trigger Download
                const link = document.createElement('a');
                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.fileBase64}`;
                link.download = result.filename || 'document.docx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert(`產生失敗: ${result.message}`);
            }
        } catch (error) {
            console.error(error);
            alert('發生錯誤，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card p-4 rounded-lg border border-border mt-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                <span className="text-2xl">📂</span> 文件生成 (Documents)
            </h3>
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => handleDownload('contract_summary')}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded font-bold shadow-sm transition-all text-sm"
                >
                    {isLoading ? '處理中...' : '📄 下載案件摘要表 (Word)'}
                </button>

                <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground/40 rounded font-bold border border-border cursor-not-allowed text-sm"
                >
                    🔒 委託書 (Coming Soon)
                </button>
            </div>
            <p className="text-[10px] text-foreground/40 mt-2 ml-1">
                * 請確保 `public/templates/contract_summary.docx` 存在
            </p>
        </div>
    );
}
