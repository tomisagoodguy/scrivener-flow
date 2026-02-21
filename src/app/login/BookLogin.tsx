'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/auth/client';
import { BookCover } from '@/components/auth/BookCover';
import { AppleAuthModal } from '@/components/auth/AppleAuthModal';
import { LogIn, Mail } from 'lucide-react';

export function BookLogin() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showAppleModal, setShowAppleModal] = useState(false);
    const supabase = createClient();

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                        scopes: 'https://www.googleapis.com/auth/drive.file email openid profile',
                    },
                },
            });
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        setLoading(false);
        setMessage(error ? error.message : '驗證信已寄出，請檢查您的信箱');
    };

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#fafafa]">
            {/* Background Decorations */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#0ea5e9_1px,transparent_1px)] bg-size-[40px_40px] opacity-[0.03]" />
            </div>

            <motion.div
                className="relative z-10 mx-auto transition-all duration-1000"
                style={{
                    width: '100%',
                    maxWidth: isOpen ? '900px' : '440px',
                    aspectRatio: isOpen ? '1.8/1' : '1/1.4',
                    perspective: '2500px'
                }}
            >
                {/* --- THE SPREAD --- */}
                <motion.div
                    className="absolute inset-0 flex bg-white/40 backdrop-blur-2xl rounded-4xl shadow-[0_32px_80px_-20px_rgba(0,0,0,0.1)] border border-white overflow-hidden transition-all duration-1000"
                    initial={false}
                    animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.95 }}
                >
                    <div className="flex-1" />
                    <div className="flex-1 bg-white p-14 flex flex-col items-center">
                        <div className="w-full max-w-[340px] flex flex-col h-full">
                            <div className="mb-10 text-center">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-900 mb-2">身分認證</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest">系統連線安全</span>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col justify-center">
                                <button onClick={handleGoogleLogin} disabled={loading} className="w-full group relative flex items-center justify-center gap-4 bg-white border border-slate-200 h-14 rounded-2xl transition-all hover:bg-slate-50 hover:shadow-xl hover:shadow-slate-100 active:scale-[0.98] disabled:opacity-50">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    <span className="font-black text-slate-700 dark:text-slate-700">使用 Google 帳號</span>
                                </button>
                                <button onClick={() => setShowAppleModal(true)} className="w-full bg-[#050505] h-14 rounded-2xl flex items-center justify-center gap-4 transition-all hover:bg-black active:scale-[0.98]">
                                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 3.87-.74c.51.01.69.05 2.01.59-1.74 1.16-1.53 4.6.61 5.48-.12.63-.26 1.19-.51 1.69-.6.18-1 1.16-1.06 1.21zM11.99 5.32c-.05.16-.1.32-.17.47-.58 1.18-1.5 1.57-2.05 1.48-.16-1.58.74-2.81 1.6-3.4 1.29-.98 2.65-.63 2.81-.59.04 1.22-.56 2.03-2.19 2.04z" /></svg>
                                    <span className="font-black text-white">Continue with Apple</span>
                                </button>
                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="bg-white dark:bg-white px-4 text-slate-300 dark:text-slate-300">OTP Login</span></div>
                                </div>
                                <form onSubmit={handleEmailLogin} className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="email" placeholder="電子郵件地址" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-14 pr-6 h-14 bg-slate-50 dark:bg-slate-50 border-2 border-transparent focus:bg-white dark:focus:bg-white focus:border-blue-500/20 rounded-2xl outline-none transition-all text-sm font-bold text-slate-900 dark:text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-400" required />
                                    </div>
                                    <button type="submit" disabled={loading || !email} className="w-full h-14 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50">
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LogIn className="w-5 h-5" /><span>傳送登入連結</span></>}
                                    </button>
                                </form>
                            </div>
                            {message && <p className="mt-6 text-xs text-center text-blue-600 font-bold bg-blue-50 py-2 rounded-xl">{message}</p>}
                        </div>
                    </div>
                </motion.div>

                <BookCover isOpen={isOpen} onClick={() => !isOpen && setIsOpen(true)} />
                {!isOpen && <><div className="absolute top-2 bottom-2 -right-3 w-4 bg-slate-200 rounded-lg z-0 border border-slate-300" /><div className="absolute top-4 bottom-4 -right-5 w-4 bg-slate-100 rounded-lg z-[-1] border border-slate-200" /></>}
            </motion.div>

            <AppleAuthModal isOpen={showAppleModal} onClose={() => setShowAppleModal(false)} />
        </div>
    );
}
