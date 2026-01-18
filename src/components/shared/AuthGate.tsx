'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/auth/client';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

interface AuthGateContextType {
    isAuthorized: boolean;
    checkPassphrase: (pass: string) => boolean;
}

const AuthGateContext = createContext<AuthGateContextType | undefined>(undefined);

const PASSPHRASE = '長的是磨難，短的是人生';

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            // If the user is on the login page or auth callback, we don't need the gate
            if (pathname === '/login' || pathname.startsWith('/auth')) {
                setIsChecking(false);
                return;
            }

            const storedAuth = localStorage.getItem('app_passphrase_authorized');
            if (storedAuth === 'true' && session) {
                setIsAuthorized(true);
            }
            setIsChecking(false);
        };

        checkAuth();
    }, [pathname, supabase.auth]);

    const checkPassphrase = (pass: string) => {
        if (pass === PASSPHRASE) {
            setIsAuthorized(true);
            localStorage.setItem('app_passphrase_authorized', 'true');
            return true;
        }
        return false;
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-sm font-bold text-slate-400 animate-pulse">系統安全檢查中...</span>
                </motion.div>
            </div>
        );
    }

    const isPublicRoute = pathname === '/login' || pathname.startsWith('/auth');
    if (!isAuthorized && !isPublicRoute) {
        return <PassphraseScreen onVerify={checkPassphrase} />;
    }

    return (
        <AuthGateContext.Provider value={{ isAuthorized, checkPassphrase }}>
            {children}
        </AuthGateContext.Provider>
    );
}

function PassphraseScreen({ onVerify }: { onVerify: (pass: string) => boolean }) {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onVerify(input)) {
            setIsSuccess(true);
            setError(false);
        } else {
            setError(true);
            setInput('');
            // Optional: reset animation key
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative font-outfit">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow font-inter" />
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-md w-full mx-4"
            >
                <div className="bg-white/10 backdrop-blur-3xl rounded-[40px] border border-white/10 p-10 shadow-2xl relative overflow-hidden group">
                    {/* Animated Border Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-indigo-500/10 pointer-events-none" />

                    <div className="text-center mb-10 relative z-10">
                        <motion.div
                            animate={isSuccess ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                            className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 ${isSuccess ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                }`}
                        >
                            {isSuccess ? <ShieldCheck size={32} /> : <Lock size={32} />}
                        </motion.div>

                        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">系統安全鎖</h1>
                        <p className="text-slate-400 font-medium text-sm leading-relaxed">
                            請輸入您的專屬授權碼以繼續<br />
                            <span className="text-slate-500 text-[10px] uppercase tracking-widest mt-2 block">Premium Scrivener Flow v2.0</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={error ? 'error' : 'normal'}
                                    initial={{ x: 0 }}
                                    animate={error ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
                                    className="relative flex items-center"
                                >
                                    <KeyRound className="absolute left-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value);
                                            if (error) setError(false);
                                        }}
                                        placeholder="請輸入通關密語..."
                                        className={`w-full pl-14 pr-6 py-5 rounded-2xl bg-white/5 border-2 transition-all outline-none text-white font-bold tracking-widest placeholder:text-slate-600 placeholder:font-normal placeholder:tracking-normal focus:bg-white/10 ${error ? 'border-red-500/50' : 'border-white/5 focus:border-blue-500/50'
                                            }`}
                                        autoFocus
                                    />
                                </motion.div>
                            </AnimatePresence>

                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-red-400 text-xs font-black mt-3 text-center uppercase tracking-widest"
                                    >
                                        密語驗證失敗，請再試一次
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isSuccess}
                            className={`w-full py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all duration-500 shadow-xl ${isSuccess
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20 hover:shadow-blue-500/40'
                                }`}
                        >
                            <span>{isSuccess ? '取得授權' : '進入系統'}</span>
                            <motion.div
                                animate={{ x: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            >
                                <ArrowRight size={20} />
                            </motion.div>
                        </motion.button>
                    </form>
                </div>

                <p className="mt-8 text-center">
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
                        Scrivener Flow Professional • 2024
                    </span>
                </p>
            </motion.div>
        </div>
    );
}

export function useAuthGate() {
    const context = useContext(AuthGateContext);
    if (!context) throw new Error('useAuthGate must be used within AuthGateProvider');
    return context;
}
