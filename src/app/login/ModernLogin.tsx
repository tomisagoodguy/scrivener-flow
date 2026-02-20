'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, ShieldCheck, Mail, LogIn, ChevronRight, X, Lock, Command, Fingerprint, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/auth/client';

export function ModernLogin() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showAppleModal, setShowAppleModal] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        setIsMounted(true);
    }, []);

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
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setLoading(false);
        if (error) {
            setMessage(error.message);
        } else {
            setMessage('驗證信已寄出，請檢查您的信箱');
        }
    };

    if (!isMounted) return null;

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center p-6 overflow-hidden bg-slate-50 dark:bg-slate-100">
            {/* --- CLEAN LIGHT BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-indigo-50/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
            </div>

            {/* --- MAIN PORTAL INTERFACE --- */}
            <div className="relative z-10 w-full max-w-[1100px] flex flex-col lg:flex-row items-center justify-between gap-16">

                {/* LEFT SIDE: THE BRAND MANIFESTO (High Legibility) */}
                <motion.div
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="flex-1 flex flex-col items-start text-left space-y-10"
                >
                    {/* Sad Cat Mascot */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 animate-pulse"></div>
                        <div className="relative w-56 md:w-64 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300 bg-white">
                            {/* Standard HTML img tag for local assets in public folder usually works easier without imports if public path is correct */}
                            <img
                                src="/login-cat.png"
                                alt="Monday Mood"
                                className="w-full h-auto block"
                            />
                        </div>
                        <div className="absolute -bottom-3 -right-2 bg-white px-4 py-1.5 rounded-full shadow-lg border border-slate-100 transform rotate-6 z-10 transition-transform group-hover:rotate-0">
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">今日值日生</span>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Next-Gen Legal Platform</span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-7xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            Legal<br />
                            <span className="text-blue-600">
                                Intelligence.
                            </span>
                        </h1>
                        <p className="text-slate-500 text-lg font-medium max-w-[460px] leading-relaxed">
                            專為法律專業人士打造的智能管理系統。簡約、安全且高效，讓案件數據成為您最強大的後盾。
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full">
                        <div className="flex items-center gap-4 bg-white/80 border border-slate-200 backdrop-blur-sm p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <Command className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-slate-900 font-bold text-sm">智能自動化</div>
                                <div className="text-slate-400 text-xs">提高效率 80%</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/80 border border-slate-200 backdrop-blur-sm p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-slate-900 font-bold text-sm">高規加密</div>
                                <div className="text-slate-400 text-xs">銀行級安全標準</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT SIDE: THE LOGIN VAULT (Clean White Card) */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="w-full max-w-[460px]"
                >
                    <div className="relative">
                        {/* Soft Ambient Glow */}
                        <div className="absolute -inset-4 bg-blue-500/5 rounded-[4rem] blur-3xl opacity-50" />

                        {/* The Actual Card */}
                        <div className="relative bg-white/90 dark:bg-white backdrop-blur-xl rounded-[3.5rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden p-12 md:p-14">

                            <div className="flex flex-col items-center mb-12">
                                <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-blue-500/20 mb-8">
                                    <Gavel className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-900 tracking-tight mb-2">身分認證</h2>
                                <p className="text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Secure Access Portal</p>
                            </div>

                            <div className="space-y-5">
                                {/* Google Connect */}
                                <button
                                    onClick={handleGoogleLogin}
                                    className="w-full h-16 bg-white dark:bg-white border border-slate-200 dark:border-slate-200 rounded-2xl flex items-center justify-center gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-100 active:scale-[0.98] group"
                                >
                                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="text-slate-700 dark:text-slate-700 font-black tracking-tight">使用 Google 帳號</span>
                                </button>

                                {/* Apple Connect */}
                                <button
                                    onClick={() => setShowAppleModal(true)}
                                    className="w-full h-16 bg-[#0a0a0a] rounded-2xl flex items-center justify-center gap-4 transition-all hover:bg-black hover:shadow-xl active:scale-[0.98] group"
                                >
                                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 3.87-.74c.51.01.69.05 2.01.59-1.74 1.16-1.53 4.6.61 5.48-.12.63-.26 1.19-.51 1.69-.6.18-1 1.16-1.06 1.21zM11.99 5.32c-.05.16-.1.32-.17.47-.58 1.18-1.5 1.57-2.05 1.48-.16-1.58.74-2.81 1.6-3.4 1.29-.98 2.65-.63 2.81-.59.04 1.22-.56 2.03-2.19 2.04z" />
                                    </svg>
                                    <span className="text-white font-black tracking-tight">Continue with Apple</span>
                                </button>

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                                    <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.4em]"><span className="bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-full px-5 py-1 text-slate-400 dark:text-slate-400">Magic Link</span></div>
                                </div>

                                <form onSubmit={handleEmailLogin} className="space-y-4">
                                    <div className="relative group/input">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                                        <input
                                            type="email"
                                            placeholder="電郵地址"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-14 h-16 bg-slate-50 dark:bg-slate-100 border-2 border-transparent focus:bg-white dark:focus:bg-white focus:border-blue-500/20 rounded-2xl outline-none transition-all text-slate-900 dark:text-slate-900 font-bold placeholder:text-slate-400 dark:placeholder:text-slate-400"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || !email}
                                        className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 text-white font-black active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn className="w-5 h-5" /><span>傳送登入連結</span></>}
                                    </button>
                                </form>
                            </div>

                            <AnimatePresence>
                                {message && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                                        <p className="text-xs text-blue-600 font-black">{message}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* --- APPLE SECURITY OVERLAY (Keep existing logic/joke) --- */}
            <AnimatePresence>
                {showAppleModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAppleModal(false)} />
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12 max-w-sm w-full text-center">
                            <button onClick={() => setShowAppleModal(false)} className="absolute top-8 right-8 p-1 text-slate-300 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-8 relative border border-slate-100 shadow-inner">
                                <svg className="w-8 h-8 text-slate-900 fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 3.87-.74c.51.01.69.05 2.01.59-1.74 1.16-1.53 4.6.61 5.48-.12.63-.26 1.19-.51 1.69-.6.18-1 1.16-1.06 1.21zM11.99 5.32c-.05.16-.1.32-.17.47-.58 1.18-1.5 1.57-2.05 1.48-.16-1.58.74-2.81 1.6-3.4 1.29-.98 2.65-.63 2.81-.59.04 1.22-.56 2.03-2.19 2.04z" /></svg>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black border-4 border-white">!</div>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-900 mb-4 tracking-tight">系統品味適配中</h3>
                            <p className="text-slate-500 dark:text-slate-500 mb-10 text-sm font-medium leading-relaxed">偵測到您的品味極高，<br />但為了維持核心開發預算，<br />請優先使用團隊指定的：<br /><span className="text-blue-600 font-black tracking-widest uppercase">Google Auth</span></p>
                            <button onClick={() => setShowAppleModal(false)} className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-200">了解</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
