'use client';

import { motion } from 'framer-motion';
import { Mail, LogIn } from 'lucide-react';

interface ResetPasswordFormProps {
    email: string;
    setEmail: (v: string) => void;
    loading: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
}

export function ResetPasswordForm({ email, setEmail, loading, onSubmit, onBack }: ResetPasswordFormProps) {
    return (
        <motion.form key="reset" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={onSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 font-bold text-center leading-relaxed">
                輸入您的 Email，我們會寄送密碼設定連結<br />
                <span className="text-slate-400 font-normal">（需在可收信的網路環境操作，僅需一次）</span>
            </p>
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
            <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-16 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 text-white font-black active:scale-[0.98] disabled:opacity-50"
            >
                {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Mail className="w-5 h-5" /><span>寄送密碼設定信</span></>}
            </button>
            <button type="button" onClick={onBack} className="w-full text-xs text-slate-400 hover:text-slate-600 font-bold py-1">← 返回登入</button>
        </motion.form>
    );
}

interface OtpLoginFormProps {
    email: string;
    setEmail: (v: string) => void;
    loading: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export function OtpLoginForm({ email, setEmail, loading, onSubmit }: OtpLoginFormProps) {
    return (
        <motion.form key="otp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={onSubmit} className="space-y-4">
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
            <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-16 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 text-white font-black active:scale-[0.98] disabled:opacity-50"
            >
                {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><LogIn className="w-5 h-5" /><span>傳送登入連結</span></>}
            </button>
        </motion.form>
    );
}
