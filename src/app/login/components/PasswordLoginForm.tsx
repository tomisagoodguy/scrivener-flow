'use client';

import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';

interface PasswordLoginFormProps {
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    loading: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onForgotPassword: () => void;
}

export function PasswordLoginForm({ email, setEmail, password, setPassword, loading, onSubmit, onForgotPassword }: PasswordLoginFormProps) {
    return (
        <motion.form key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={onSubmit} className="space-y-4">
            <div className="relative group/input">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                <input
                    type="email"
                    placeholder="電郵地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 h-16 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500/20 rounded-2xl outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400"
                    required
                />
            </div>
            <div className="relative group/input">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                <input
                    type="password"
                    placeholder="密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 h-16 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500/20 rounded-2xl outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-16 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 text-white font-black active:scale-[0.98] disabled:opacity-50"
            >
                {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><LogIn className="w-5 h-5" /><span>登入</span></>}
            </button>
            <button type="button" onClick={onForgotPassword} className="w-full text-xs text-slate-400 hover:text-blue-600 font-bold py-1 transition-colors">
                首次使用？忘記密碼？→ 設定密碼
            </button>
        </motion.form>
    );
}
