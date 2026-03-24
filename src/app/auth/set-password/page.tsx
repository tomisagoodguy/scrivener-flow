'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/client';
import { Gavel, Copy, RefreshCw, CheckCircle } from 'lucide-react';

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字元 0/O/1/I
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function SetPasswordPage() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [done, setDone] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        setPassword(generatePassword());
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirm = async () => {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) {
            alert('設定失敗：' + error.message);
        } else {
            setDone(true);
            setTimeout(() => router.replace('/'), 3000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md bg-white rounded-[3rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-12">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 mb-6">
                        <Gavel className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">您的登入密碼</h1>
                    <p className="text-slate-400 text-xs font-bold mt-1 text-center">請記住或截圖保存，之後在公司內網用此密碼登入</p>
                </div>

                {done ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <p className="text-lg font-black text-slate-900">密碼設定成功！</p>
                        <p className="text-sm text-slate-400">3 秒後自動跳轉...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 密碼顯示區 */}
                        <div className="bg-slate-50 rounded-2xl p-6 text-center border-2 border-slate-100">
                            <p className="text-4xl font-black tracking-[0.3em] text-slate-900 mb-4">{password}</p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    {copied ? '已複製！' : '複製'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPassword(generatePassword())}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    換一組
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            className="w-full h-16 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 text-white font-black active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <span>我記住了，確認使用</span>
                            }
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
