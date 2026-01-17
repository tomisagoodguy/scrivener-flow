import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // 2. Refresh Session
    // This will refresh the session if needed and update the cookie
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // 3. Define Protected Routes
    // Allow assets, auth routes, and public APIs if any
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/static') ||
        pathname === '/favicon.ico'
    ) {
        return response
    }

    // 4. Redirect Logic
    // If NO user and NOT on login page -> Redirect to Login
    if (!user && !pathname.startsWith('/login')) {
        const loginUrl = new URL('/login', request.url)
        // loginUrl.searchParams.set('redirect_to', pathname) // Optional: preserve redirect
        return NextResponse.redirect(loginUrl)
    }

    // If HAS user and IS on login page -> Redirect to Home
    if (user && pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
