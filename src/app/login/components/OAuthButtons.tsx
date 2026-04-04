'use client';

interface OAuthButtonsProps {
    onGoogleLogin: () => void;
    onAppleClick: () => void;
}

export function OAuthButtons({ onGoogleLogin, onAppleClick }: OAuthButtonsProps) {
    return (
        <>
            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.4em]">
                    <span className="bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-full px-5 py-1 text-slate-400 dark:text-slate-400">或使用社群帳號</span>
                </div>
            </div>

            <button
                onClick={onGoogleLogin}
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

            <button
                onClick={onAppleClick}
                className="w-full h-16 bg-[#0a0a0a] rounded-2xl flex items-center justify-center gap-4 transition-all hover:bg-black hover:shadow-xl active:scale-[0.98] group"
            >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 3.87-.74c.51.01.69.05 2.01.59-1.74 1.16-1.53 4.6.61 5.48-.12.63-.26 1.19-.51 1.69-.6.18-1 1.16-1.06 1.21zM11.99 5.32c-.05.16-.1.32-.17.47-.58 1.18-1.5 1.57-2.05 1.48-.16-1.58.74-2.81 1.6-3.4 1.29-.98 2.65-.63 2.81-.59.04 1.22-.56 2.03-2.19 2.04z" />
                </svg>
                <span className="text-white font-black tracking-tight">Continue with Apple</span>
            </button>
        </>
    );
}
