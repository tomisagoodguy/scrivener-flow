'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, X, Sparkles, Command, ShieldCheck } from 'lucide-react';
import { useLoginFlow } from '@/hooks/useLoginFlow';
import { MfaTotpForm } from './components/MfaTotpForm';
import { PasswordLoginForm } from './components/PasswordLoginForm';
import { ResetPasswordForm, OtpLoginForm } from './components/OtpLoginForm';
import { OAuthButtons } from './components/OAuthButtons';

export function ModernLogin() {
    const {
        email, setEmail, password, setPassword, totpCode, setTotpCode,
        loginMode, setMode, mfaStep, resetMfa,
        loading, message, messageType,
        showAppleModal, setShowAppleModal,
        handleGoogleLogin, handlePasswordLogin, handleTotpVerify,
        handleResetPassword, handleEmailLogin,
    } = useLoginFlow();

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center p-6 overflow-hidden bg-slate-50 dark:bg-slate-100">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-indigo-50/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[32px_32px] opacity-40" />
            </div>

            <div className="relative z-10 w-full max-w-[1100px] flex flex-col lg:flex-row items-center justify-between gap-16">

                {/* Left: Brand */}
                <motion.div
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="flex-1 flex flex-col items-start text-left space-y-10"
                >
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 animate-pulse"></div>
                        <div className="relative w-56 md:w-64 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300 bg-white">
                            <Image src="/login-cat.png" alt="Monday Mood" width={256} height={256} className="w-full h-auto block" priority />
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
                            Legal<br /><span className="text-blue-600">Intelligence.</span>
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

                {/* Right: Login Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="w-full max-w-[460px]"
                >
                    <div className="relative">
                        <div className="absolute -inset-4 bg-blue-500/5 rounded-[4rem] blur-3xl opacity-50" />
                        <div className="relative bg-white/90 dark:bg-white backdrop-blur-xl rounded-[3.5rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden p-12 md:p-14">

                            <div className="flex flex-col items-center mb-12">
                                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 mb-8">
                                    <Gavel className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-900 tracking-tight mb-2">身分認證</h2>
                                <p className="text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Secure Access Portal</p>
                            </div>

                            <div className="space-y-5">
                                {/* Mode tabs */}
                                <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setMode('password')}
                                        className={`flex-1 h-10 rounded-xl text-xs font-black transition-all ${loginMode === 'password' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        帳號登入
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('otp')}
                                        className={`flex-1 h-10 rounded-xl text-xs font-black transition-all ${loginMode === 'otp' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        一次性連結
                                    </button>
                                </div>

                                <AnimatePresence mode="wait">
                                    {mfaStep === 'totp' ? (
                                        <MfaTotpForm
                                            totpCode={totpCode}
                                            setTotpCode={setTotpCode}
                                            loading={loading}
                                            onSubmit={handleTotpVerify}
                                            onBack={resetMfa}
                                        />
                                    ) : loginMode === 'password' ? (
                                        <PasswordLoginForm
                                            email={email}
                                            setEmail={setEmail}
                                            password={password}
                                            setPassword={setPassword}
                                            loading={loading}
                                            onSubmit={handlePasswordLogin}
                                            onForgotPassword={() => setMode('reset')}
                                        />
                                    ) : loginMode === 'reset' ? (
                                        <ResetPasswordForm
                                            email={email}
                                            setEmail={setEmail}
                                            loading={loading}
                                            onSubmit={handleResetPassword}
                                            onBack={() => setMode('password')}
                                        />
                                    ) : (
                                        <OtpLoginForm
                                            email={email}
                                            setEmail={setEmail}
                                            loading={loading}
                                            onSubmit={handleEmailLogin}
                                        />
                                    )}
                                </AnimatePresence>

                                <OAuthButtons
                                    onGoogleLogin={handleGoogleLogin}
                                    onAppleClick={() => setShowAppleModal(true)}
                                />
                            </div>

                            <AnimatePresence>
                                {message && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-8 p-4 rounded-2xl border text-center ${messageType === 'error' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                        <p className={`text-xs font-black ${messageType === 'error' ? 'text-red-600' : 'text-blue-600'}`}>{message}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Apple Modal */}
            <AnimatePresence>
                {showAppleModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-100 flex items-center justify-center p-4">
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
