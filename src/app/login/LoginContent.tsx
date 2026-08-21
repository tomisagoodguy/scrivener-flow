'use client';

import { createClient } from '@/lib/auth/client';
import { GOOGLE_OAUTH_SCOPES } from '@/lib/google/calendar';
import { useState } from 'react';

export function LoginContent() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [showAppleModal, setShowAppleModal] = useState(false);
    const supabase = createClient();

    const handleLogin = async () => {
        try {
            setLoading(true);
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                    scopes: GOOGLE_OAUTH_SCOPES,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
        } catch (error) {
            console.error('Login error:', error);
        } finally {
            // setLoading(false) // Don't reset if redirecting, usually
        }
    };

    return (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/50 dark:border-slate-700 shadow-xl rounded-2xl p-8 w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-2xl">
                    📑
                </div>
            </div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                My Case Tracker
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">案件追蹤管理系統 • 請使用 Google 帳號登入</p>

            <div className="w-full space-y-4">
                {/* Magic Link Login Form */}
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!email) return;
                        try {
                            setLoading(true);
                            setMessage('');
                            const { error } = await supabase.auth.signInWithOtp({
                                email,
                                options: {
                                    emailRedirectTo: `${location.origin}/auth/callback`,
                                },
                            });
                            if (error) throw error;
                            setMessage('✅ 登入連結已發送！請檢查您的信箱。');
                        } catch (error: any) {
                            console.error('Magic Link error:', error);
                            alert('發送失敗：' + error.message);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    className="flex flex-col gap-3"
                >
                    <input
                        type="email"
                        placeholder="輸入 Email (免密碼登入)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="animate-pulse">發送中...</span>
                        ) : (
                            <>
                                <span>✨ 發送登入連結</span>
                            </>
                        )}
                    </button>
                </form>

                {message && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium animate-fade-in">
                        {message}
                    </div>
                )}

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200 dark:border-slate-700"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-800 px-2 text-slate-400">或使用 Google</span>
                    </div>
                </div>

                {/* Google Login Button */}
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium transition-all hover:shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                    <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 transition-transform group-hover:scale-110"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    <span>Google 快速登入</span>
                </button>

                {/* Fake Apple Login Button (Troll) */}
                <button
                    onClick={() => setShowAppleModal(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-black hover:bg-slate-900 text-white border border-black rounded-xl px-4 py-3 font-medium transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 3.87-.74c.51.01.69.05 2.01.59-1.74 1.16-1.53 4.6.61 5.48-.12.63-.26 1.19-.51 1.69-.6.18-1 1.16-1.06 1.21zM11.99 5.32c-.05.16-.1.32-.17.47-.58 1.18-1.5 1.57-2.05 1.48-.16-1.58.74-2.81 1.6-3.4 1.29-.98 2.65-.63 2.81-.59.04 1.22-.56 2.03-2.19 2.04z" />
                    </svg>
                    <span>Continue with Apple</span>
                </button>
            </div>

            <div className="mt-8 text-xs text-slate-400">Internal Use Only • Secure Login via Google Workspace</div>

            {/* Fancy Apple Dialog Modal */}
            {showAppleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
                    {/* Backdrop */}
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowAppleModal(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full mx-auto transform transition-all scale-100 animate-slide-up border border-slate-100 dark:border-slate-700">
                        <div className="flex flex-col items-center text-center">
                            {/* Icon Wrapper */}
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <svg className="w-8 h-8 text-slate-800 dark:text-white fill-current" viewBox="0 0 24 24">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 3.87-.74c.51.01.69.05 2.01.59-1.74 1.16-1.53 4.6.61 5.48-.12.63-.26 1.19-.51 1.69-.6.18-1 1.16-1.06 1.21zM11.99 5.32c-.05.16-.1.32-.17.47-.58 1.18-1.5 1.57-2.05 1.48-.16-1.58.74-2.81 1.6-3.4 1.29-.98 2.65-.63 2.81-.59.04 1.22-.56 2.03-2.19 2.04z" />
                                </svg>
                                <div className="absolute -right-1 -top-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-800">
                                    !
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                功能暫不提供
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                系統偵測到您的品味非凡，但為了替我節省 Apple Tax 年費，建議您使用 Google 或 Email 登入。
                                <br />
                                <span className="text-xs text-slate-400 mt-2 block"></span>
                            </p>

                            <button
                                onClick={() => setShowAppleModal(false)}
                                className="w-full py-3 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-medium rounded-xl transition-all active:scale-[0.98]"
                            >
                                好喔，我去用 Google
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
