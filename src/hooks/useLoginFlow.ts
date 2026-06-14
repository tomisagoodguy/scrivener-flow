'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/client';

export type LoginMode = 'password' | 'otp' | 'reset';
export type MfaStep = 'none' | 'totp';

export function useLoginFlow() {
    const supabase = createClient();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [loginMode, setLoginMode] = useState<LoginMode>('password');
    const [mfaStep, setMfaStep] = useState<MfaStep>('none');
    const [mfaFactorId, setMfaFactorId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'info' | 'error'>('info');
    const [showAppleModal, setShowAppleModal] = useState(false);

    const setMode = (mode: LoginMode) => {
        setLoginMode(mode);
        setMessage('');
    };

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
                        scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.app.created email openid profile',
                    },
                },
            });
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setMessageType('error');
                setMessage(error.message === 'Invalid login credentials' ? 'Email 或密碼錯誤' : error.message);
                setLoading(false);
                return;
            }

            if (data.session?.user) {
                const { data: factorsData } = await supabase.auth.mfa.listFactors();
                const totpFactor = factorsData?.totp?.[0];
                if (totpFactor?.status === 'verified') {
                    setMfaFactorId(totpFactor.id);
                    setMfaStep('totp');
                    setLoading(false);
                    return;
                }
            }

            setMessageType('info');
            setMessage('登入成功，正在導向...');
            router.refresh();
            setTimeout(() => router.push('/'), 300);
        } catch (error: unknown) {
            setMessageType('error');
            setMessage(error instanceof Error ? error.message : '網路異常，無法連線至認證伺服器');
            setLoading(false);
        }
    };

    const handleTotpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totpCode || !mfaFactorId) return;
        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: totpCode });
            if (error) {
                setMessageType('error');
                setMessage('驗證碼錯誤，請重新輸入');
            } else {
                setMessageType('info');
                setMessage('驗證成功，正在導向...');
                router.refresh();
                setTimeout(() => router.push('/'), 300);
            }
        } catch (error: unknown) {
            setMessageType('error');
            setMessage(error instanceof Error ? error.message : '驗證異常，無法連線伺服器');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
            });
            if (error) {
                setMessageType('error');
                setMessage(error.message);
            } else {
                setMessageType('info');
                setMessage('密碼設定信已寄出，請至信箱點擊連結（有效 1 小時）');
            }
        } catch (error: unknown) {
            setMessageType('error');
            setMessage(error instanceof Error ? error.message : '重設請求異常，無法連線伺服器');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
            });
            if (error) {
                setMessageType('error');
                setMessage(error.message);
            } else {
                setMessageType('info');
                setMessage('驗證信已寄出，請檢查您的信箱');
            }
        } catch (error: unknown) {
            setMessageType('error');
            setMessage(error instanceof Error ? error.message : '登入請求異常，無法連線伺服器');
        } finally {
            setLoading(false);
        }
    };

    const resetMfa = () => { setMfaStep('none'); setTotpCode(''); };

    return {
        email, setEmail, password, setPassword, totpCode, setTotpCode,
        loginMode, setMode, mfaStep, resetMfa,
        loading, message, messageType,
        showAppleModal, setShowAppleModal,
        handleGoogleLogin, handlePasswordLogin, handleTotpVerify,
        handleResetPassword, handleEmailLogin,
    };
}
