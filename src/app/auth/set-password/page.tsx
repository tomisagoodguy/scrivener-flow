'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/client';
import { Gavel, Lock, LogIn } from 'lucide-react';

export default function SetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setError('兩次輸入的密碼不一致');
            return;
        }
        if (password.length < 8) {
            setError('密碼至少需要 8 個字元');
            return;
        }
        setLoading(true);
        setError('');
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setMessage('密碼設定成功！3 秒後自動跳轉...');
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
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">設定登入密碼</h1>
                    <p className="text-slate-400 text-xs font-bold mt-1">設定完成後即可在公司內網使用帳號登入</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group/input">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        <input
                            type="password"
                            placeholder="新密碼（至少 8 個字元）"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-14 h-16 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500/20 rounded-2xl outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400"
                            required
                        />
                    </div>
                    <div className="relative group/input">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        <input
                            type="password"
                            placeholder="確認密碼"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full pl-14 h-16 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500/20 rounded-2xl outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400"
                            required
                        />
                    </div>

                    {error && <p className="text-xs text-red-600 font-bold text-center">{error}</p>}
                    {message && <p className="text-xs text-green-600 font-bold text-center">{message}</p>}

                    <button
                        type="submit"
                        disabled={loading || !password || !confirm}
                        className="w-full h-16 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 text-white font-black active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><LogIn className="w-5 h-5" /><span>確認設定</span></>
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}
