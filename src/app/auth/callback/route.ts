import { NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as any;
    const next = searchParams.get('next') ?? '/';

    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';

    const buildRedirect = (path: string) => {
        if (isLocalEnv) return new URL(path, origin).toString();
        if (forwardedHost) return `https://${forwardedHost}${path}`;
        return new URL(path, origin).toString();
    };

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // 持久化 Google Token 到 user_settings，供後端 Drive API 使用
            const session = data.session;
            if (session?.provider_token) {
                await supabase.from('user_settings').upsert({
                    user_id: session.user.id,
                    google_access_token: session.provider_token,
                    google_refresh_token: session.provider_refresh_token,
                    last_token_update: new Date().toISOString(),
                });
            }
            return NextResponse.redirect(buildRedirect(next));
        }
        console.error('exchangeCodeForSession error:', error.message);
    }

    if (token_hash && type) {
        const supabase = await createClient();
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!error) {
            return NextResponse.redirect(buildRedirect(next));
        }
        console.error('verifyOtp error:', error.message);
    }

    if (!code && !token_hash) {
        return NextResponse.redirect(buildRedirect(`/auth/confirm?next=${encodeURIComponent(next)}`));
    }

    return NextResponse.redirect(buildRedirect(`/login?error=auth-code-error`));
}
