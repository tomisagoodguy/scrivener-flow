import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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
        // 這會告訴搜尋引擎和瀏覽器：「舊網址已經廢棄，請永遠使用新網址」
        return NextResponse.redirect(newUrl, 301);
    }

    return NextResponse.next();
}

// 設定 Middleware 的匹配路徑
// 排除靜態資源、圖片、favicon 等，避免不必要的執行消耗
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
