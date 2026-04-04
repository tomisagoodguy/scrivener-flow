'use client';

import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

interface MfaTotpFormProps {
    totpCode: string;
    setTotpCode: (v: string) => void;
    loading: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
}

export function MfaTotpForm({ totpCode, setTotpCode, loading, onSubmit, onBack }: MfaTotpFormProps) {
    return (
        <motion.form key="totp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={onSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 font-bold text-center">開啟驗證器 App（如 Google Authenticator），輸入 6 位數字</p>
            <div className="relative group/input">
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center tracking-[0.5em] text-2xl font-black h-16 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500/20 rounded-2xl outline-none transition-all text-slate-900 placeholder:text-slate-300"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full h-16 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 text-white font-black active:scale-[0.98] disabled:opacity-50"
            >
                {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><LogIn className="w-5 h-5" /><span>驗證並登入</span></>}
            </button>
            <button type="button" onClick={onBack} className="w-full text-xs text-slate-400 hover:text-slate-600 font-bold py-1">返回</button>
        </motion.form>
    );
}
