'use client';


import { useAuthUser } from '@/hooks/useAuthUser';

export default function WelcomeHeader() {
    const { user } = useAuthUser();
    const hours = new Date().getHours();
    const greeting = hours < 12 ? '早安' : hours < 18 ? '午安' : '晚安';

    const userName = user?.user_metadata?.full_name
        ?? user?.email?.split('@')[0]
        ?? '...';

    return (
        <div className="mb-3 pl-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{greeting}，</span>
                <span className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                    {userName}
                </span>
                <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
                這是您的個人代書工作台，所有工具已準備就緒。
            </p>
        </div>
    );
}
