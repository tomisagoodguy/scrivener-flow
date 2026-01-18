'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function WelcomeHeader() {
    const [userName, setUserName] = useState('...');
    const hours = new Date().getHours();
    const greeting = hours < 12 ? '早安' : hours < 18 ? '午安' : '晚安';

    useEffect(() => {
        const updateUserName = (user: any) => {
            if (user?.user_metadata?.full_name) {
                setUserName(user.user_metadata.full_name);
            } else if (user?.email) {
                setUserName(user.email.split('@')[0]);
            } else {
                setUserName('Administrator');
            }
        };

        // Initial check
        supabase.auth.getUser().then(({ data: { user } }) => {
            updateUserName(user);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            updateUserName(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className="mb-8 pl-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{greeting}，</span>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
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
