import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // -----------------------------------------------------------------
    // 1. Domain Redirection (Force Custom Domain)
    // -----------------------------------------------------------------
    const hostname = request.headers.get('host');
    const prodDomain = 'www.case-master.com';

    // 檢查是否是來自 Vercel 的預設網域
    if (hostname && hostname.includes('vercel.app')) {
        // 建立新的 URL
        const newUrl = new URL(request.url);
        newUrl.hostname = prodDomain;
        newUrl.protocol = 'https';
        newUrl.port = ''; // 清除任何可能的 port

        // 使用 301 永久轉址 (Permanent Redirect)
        return NextResponse.redirect(newUrl, 301);
    }

    // -----------------------------------------------------------------
    // 2. Supabase Auth & Protected Routes (Original proxy.ts logic)
    // -----------------------------------------------------------------
    let response = NextResponse.next({
        request: {
            headers: request.headers,
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
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Define Protected Routes - Allow specific paths
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/static') ||
        pathname === '/favicon.ico'
    ) {
        return response;
    }

    // Redirect Logic
    // If NO user and NOT on login page -> Redirect to Login
    if (!user && !pathname.startsWith('/login')) {
        const loginUrl = new URL('/login', request.url);
        // loginUrl.searchParams.set('redirect_to', pathname) // Optional: preserve redirect
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
