import { NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as any;
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/';

    const redirectTo = new URL(next, origin);

    if (code) {
        const supabase = await createClient();
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && session) {
            // 持久化 Google Token 到 user_settings，供後端 Drive API 使用
            if (session.provider_token) {
                await supabase.from('user_settings').upsert({
                    user_id: session.user.id,
                    google_access_token: session.provider_token,
                    google_refresh_token: session.provider_refresh_token,
                    last_token_update: new Date().toISOString(),
                });
                console.log('Google Token persisted for user:', session.user.id);
            }

            const forwardedHost = request.headers.get('x-forwarded-host');
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                return NextResponse.redirect(redirectTo);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(redirectTo);
            }
        }
    } else if (token_hash && type) {
        const supabase = await createClient();
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
        });
        if (!error) {
            return NextResponse.redirect(redirectTo);
        } else {
            console.error('Verify OTP error:', error);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
