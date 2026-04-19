'use client';

import React, { useState } from 'react';
import { generateInvestmentPromptAction } from '@/app/actions/ai/generateInvestmentPromptAction';
import { Holding } from '@/types/investment';
import { Bot, Copy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

import ReactMarkdown from 'react-markdown';

interface AIAnalysisPromptButtonProps {
    holdings: Holding[];
    dataDate: string;
}

export function AIAnalysisPromptButton({ holdings, dataDate }: AIAnalysisPromptButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisReport, setAnalysisReport] = useState('');

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const result = await generateInvestmentPromptAction({ holdings, dataDate });
            if (result.success && result.prompt) {
                setAnalysisReport(result.prompt);
                toast.success('分析報告生成成功！');
            } else {
                toast.error(result.message || '生成失敗');
            }
        } catch (_error) {
            toast.error('無法生成分析建議');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(analysisReport);
        toast.success('已複製到剪貼簿！');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    className="gap-2 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-800 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-300 transition-all"
                >
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    AI 智能分析報告
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        00981A 量化體檢報告
                    </DialogTitle>
                    <DialogDescription>
                        Gemini 分析三大量化 Filter：動能(60日)、投信5日累積、Rev MA3 創12月新高，識別強勢複合信號股。
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {!analysisReport && !isLoading && (
                        <div className="flex flex-col items-center justify-center p-12 h-full bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                            <Sparkles className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-slate-500 mb-6 text-center">
                                點擊下方按鈕，AI 將為您計算<br/>
                                <span className="font-semibold text-indigo-500">動能 × 投信 × Rev New High</span> 三大量化 Filter
                            </p>
                            <Button onClick={handleGenerate} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                                <Sparkles className="w-5 h-5 mr-2" />
                                開始生成分析報告
                            </Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 animate-ping"></div>
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin relative z-10" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-medium text-lg text-slate-800 dark:text-slate-200">正在進行量化體檢...</h3>
                                <p className="text-slate-500 text-sm">計算 60日動能 • 統計投信5日買超 • 辨識Rev MA3新高</p>
                            </div>
                        </div>
                    )}

                    {analysisReport && (
                        <div className="prose prose-slate dark:prose-invert max-w-none p-4">
                            <ReactMarkdown>{analysisReport}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {analysisReport && (
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>關閉</Button>
                        <Button onClick={handleCopy} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                            <Copy className="w-4 h-4" />
                            複製報告全文
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
