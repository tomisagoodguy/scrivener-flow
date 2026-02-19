'use client';

import React, { useState, useEffect } from 'react';
import { generateAIBriefing } from '@/app/actions/ai';
import { sendLineMessage } from '@/app/actions/lineNotify';
import { Sparkles, Send, Loader2, Calendar, User, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function AIWorkAssistant() {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [lastDraft, setLastDraft] = useState<string | null>(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === 'tom890108159@gmail.com') {
            setIsVisible(true);
            setInitialized(true);
            setMessages([{ role: 'ai', content: '您好！我是您的 AI 行政特助。請點擊下方按鈕，或直接輸入指令。' }]);
        }
    };

    const handleQuickAction = async (action: string) => {
        let userMsg = '';
        if (action === 'briefing') userMsg = '請提供今日工作概覽與待辦事項整理。';
        if (action === 'progress') userMsg = '請檢查目前進度落後或卡關的案件。';
        if (action === 'stress') userMsg = '請分析目前的工作量與時間壓力。';

        if (!userMsg) return;

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const result = await generateAIBriefing(userMsg);
            if (result.success && result.message) {
                setMessages(prev => [...prev, { role: 'ai', content: result.message }]);
                // Extract draft if present
                const draftMatch = result.message.match(/:::LINE_DRAFT_START:::([\s\S]*?):::LINE_DRAFT_END:::/);
                if (draftMatch) setLastDraft(draftMatch[1].trim());
            } else {
                toast.error(result.message || '回應失敗');
            }
        } catch (e) {
            toast.error('連線錯誤');
        } finally {
            setLoading(false);
        }
    };

    const handleSendline = async (text: string) => {
        const toastId = toast.loading('正在發送 LINE 訊息...');
        try {
            const res = await sendLineMessage(text);
            if (res.success) {
                toast.success('LINE 訊息已發送！', { id: toastId });
                setLastDraft(null); // Clear after manual send
            } else {
                toast.error(`發送失敗: ${res.error}`, { id: toastId });
            }
        } catch (e) {
            toast.error('連線錯誤', { id: toastId });
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        let userMsg = input;

        // Context enhancement: If user says "Confirm/OK" and we have a draft, inject it into the prompt
        const confirmationKeywords = ['可以', 'ok', '好', '寄吧', '發送', '寄出'];
        if (lastDraft && confirmationKeywords.some(k => input.toLowerCase().includes(k)) && input.length < 10) {
            userMsg = `【Context: 上一回建議的 LINE 草稿內容如下：\n"""\n${lastDraft}\n"""\n】使用者說：${input}`;
        }

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: input }]); // Show original input in UI
        setLoading(true);

        try {
            const result = await generateAIBriefing(userMsg);
            if (result.success && result.message) {
                setMessages(prev => [...prev, { role: 'ai', content: result.message }]);
                // Update draft for next turn
                const draftMatch = result.message.match(/:::LINE_DRAFT_START:::([\s\S]*?):::LINE_DRAFT_END:::/);
                if (draftMatch) setLastDraft(draftMatch[1].trim());
                else if (!result.message.includes('LINE')) setLastDraft(null); // Clear if AI changed topic
            } else {
                toast.error(result.message || '回應失敗');
            }
        } catch (e) {
            toast.error('連線錯誤');
        } finally {
            setLoading(false);
        }
    };

    const renderMessageContent = (content: string) => {
        const draftRegex = /:::LINE_DRAFT_START:::([\s\S]*?):::LINE_DRAFT_END:::/;
        const match = content.match(draftRegex);

        if (match) {
            const [fullStr, draftText] = match;
            const parts = content.split(fullStr);
            const cleanDraft = draftText.trim();

            return (
                <div className="w-full">
                    {parts[0]}
                    <div className="my-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            LINE 預覽 (Ready to Send)
                        </div>
                        <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm text-sm">
                            {cleanDraft}
                        </div>
                        <button
                            onClick={() => handleSendline(cleanDraft)}
                            className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                            確認並發送 LINE
                        </button>
                    </div>
                    {parts[1]}
                </div>
            );
        }

        return content;
    };

    if (!isVisible) return null;

    return (
        <div className="mb-6 bg-linear-to-r from-indigo-600 to-blue-600 rounded-3xl p-px shadow-xl shadow-indigo-500/20 animate-fade-in tracking-tight">
            <div className="bg-white dark:bg-slate-900 rounded-[23px] overflow-hidden">
                {/* Header */}
                <div
                    title="點擊展開/收合助理"
                    className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center cursor-pointer select-none transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                Scrivener AI 行政特助
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] rounded-full uppercase tracking-wider font-bold">PRO</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-normal">您的專屬智慧助理 - 隨時待命</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {loading && !initialized && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                </div>

                {/* Content */}
                {isExpanded && (
                    <div className="flex flex-col h-[450px]">
                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-900/50 scroll-smooth">
                            {messages.length === 0 && loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                    <p className="text-sm font-medium animate-pulse">正在整理您的今日概況...</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none whitespace-pre-wrap'
                                            }`}>
                                            {msg.role === 'ai' && (
                                                <div className="flex items-center gap-2 mb-2 text-indigo-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50 pb-2">
                                                    <Sparkles className="w-3 h-3" />
                                                    AI Assistant Response
                                                </div>
                                            )}
                                            {renderMessageContent(msg.content)}
                                        </div>
                                    </div>
                                ))
                            )}
                            {loading && initialized && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm px-5 py-3">
                                        <div className="flex gap-1.5 items-center h-4">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions (Chips) */}
                        {!loading && messages.length === 1 && (
                            <div className="px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
                                <button
                                    onClick={() => handleQuickAction('briefing')}
                                    className="whitespace-nowrap px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-full text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100/50 dark:border-indigo-500/20 flex items-center gap-2 active:scale-95"
                                >
                                    📅 今日概覽
                                </button>
                                <button
                                    onClick={() => handleQuickAction('progress')}
                                    className="whitespace-nowrap px-4 py-2 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 rounded-full text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all border border-amber-100/50 dark:border-amber-500/20 flex items-center gap-2 active:scale-95"
                                >
                                    🚨 進度追蹤
                                </button>
                                <button
                                    onClick={() => handleQuickAction('stress')}
                                    className="whitespace-nowrap px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-full text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100/50 dark:border-emerald-500/20 flex items-center gap-2 active:scale-95"
                                >
                                    📊 壓力分析
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="問問特定行程、或是請我幫助撰寫訊息..."
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 dark:text-white"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
