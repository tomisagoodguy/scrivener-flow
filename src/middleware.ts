import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
    // 初始化 request headers
    const requestHeaders = new Headers(request.headers);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Refresh Session
    // 使用 try-catch 捕捉 getUser 可能發生的 AuthApiError (如 Refresh Token 失效)
    // 確保即使 Token 無效，程式也能繼續執行並正確將 user 設為 null
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (_e) {
        // 發生錯誤視為未登入
        // console.error('Middleware Auth Error:', e);
    }

    const { pathname } = request.nextUrl;

    // Define Protected Routes - Allow specific paths
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/weather') || // 加入天氣 API
        pathname.startsWith('/auth') ||
        pathname.startsWith('/static') ||
        pathname === '/favicon.ico'
    ) {
        return response;
    }

    // 投資監控頁公開開放（DB 層已開放 RLS 公開讀取）
    if (pathname.startsWith('/investment') || pathname.startsWith('/api/investment')) {
        return response;
    }

    // Redirect Logic
    // If NO user and NOT on login page
    if (!user && !pathname.startsWith('/login')) {
        // 如果是 API 請求，回傳 401 JSON 而非轉址到 HTML 頁面
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If HAS user and IS on login page -> Redirect to Home
    if (user && pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images/assets extensions
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
