'use client';

import { MessageSquare } from 'lucide-react';
import { useMessageGenerator } from './message-generator/useMessageGenerator';
import { MessageParameters, MessageActions } from './message-generator/MessageComponents';

interface CaseMessageGeneratorProps {
    caseData: any;
}

export default function CaseMessageGenerator({ caseData }: CaseMessageGeneratorProps) {
    const {
        selectedTemplate,
        setSelectedTemplate,
        generatedText,
        setGeneratedText,
        copied,
        sending,
        userTemplates,
        isSaving,
        inputs,
        setInputs,
        generate,
        handleSaveTemplate,
        handleDeleteTemplate,
        copyToClipboard,
        sendToLine
    } = useMessageGenerator(caseData);

    return (
        <div className="bg-linear-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            AI 訊息生成器
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Message Generator</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700">
                    E2EE Encrypted
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Controls (4/12 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 模板選擇器 */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                            選擇範本 (Template)
                        </label>
                        <div className="relative">
                            <select
                                value={String(selectedTemplate)}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedTemplate(val);
                                    generate(val);
                                }}
                                className="w-full appearance-none bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm hover:border-blue-300"
                            >
                                <optgroup label="常用範本">
                                    <option value="PREPAID_FEES">📄 預收規費通知</option>
                                    <option value="NEXT_PAYMENT">💰 付款/尾款通知</option>
                                    <option value="SIGNING">✍️ 簽約通知</option>
                                    <option value="SEAL">⭕ 用印通知</option>
                                    <option value="TAX_PAYMENT">🧾 完稅通知</option>
                                    <option value="HANDOVER">🏠 交屋通知</option>
                                </optgroup>
                                <option value="CUSTOM">✏️ 自訂訊息</option>
                                {userTemplates.length > 0 && (
                                    <optgroup label="我的範本">
                                        {userTemplates.map((t, idx) => (
                                            <option key={idx} value={`USER_${idx}`}>⭐ {t.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* 參數面板 */}
                    <MessageParameters
                        selectedTemplate={selectedTemplate}
                        inputs={inputs}
                        setInputs={setInputs}
                        userTemplates={userTemplates}
                        onDeleteTemplate={handleDeleteTemplate}
                    />
                </div>

                {/* Right: Preview & Action (8/12 cols) */}
                <div className="lg:col-span-8 flex flex-col h-full">
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">
                            訊息預覽 (Preview)
                        </label>
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                            可直接編輯內容
                        </span>
                    </div>

                    <div className="relative grow group">
                        <textarea
                            value={generatedText}
                            onChange={(e) => {
                                setGeneratedText(e.target.value);
                                if (selectedTemplate !== 'CUSTOM' && !String(selectedTemplate).startsWith('USER_')) {
                                    setSelectedTemplate('CUSTOM');
                                }
                            }}
                            className="w-full h-full min-h-[400px] bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-base leading-relaxed border-2 border-slate-100 dark:border-slate-700 
                                      focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none font-mono text-slate-700 dark:text-slate-200
                                      shadow-inner transition-all selection:bg-blue-100 selection:text-blue-900"
                        />
                        {/* Status Indicator */}
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <div className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${generatedText.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                {generatedText.length} chars
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <MessageActions
                        copied={copied}
                        sending={sending}
                        isSaving={isSaving}
                        onCopy={copyToClipboard}
                        onSave={handleSaveTemplate}
                        onSend={sendToLine}
                    />
                </div>
            </div>
        </div>
    );
}
