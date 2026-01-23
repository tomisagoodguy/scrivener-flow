import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    turbopack: {},

    // 🔒 Security Headers - 提升網站安全性評分
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // 🛡️ Content Security Policy - 防止 XSS 攻擊
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            // 移除 'unsafe-eval'，僅保留 'unsafe-inline' (Next.js Hydration 必須，除非實作 Nonce)
                            "script-src 'self' 'unsafe-inline' https://vercel.live",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com data:",
                            "img-src 'self' data: https: blob:",
                            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'"
                        ].join('; ')
                    },
                    // 🚫 Clickjacking Protection
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    // 📦 MIME Type Sniffing Protection
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    // 🔐 XSS Protection (舊版瀏覽器相容)
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    // 🌐 Referrer Policy
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    // 🔒 Permissions Policy (限制瀏覽器功能)
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    }
                ]
            }
        ];
    },

    // 🎭 隱藏技術棧資訊 (移除 X-Powered-By)
    poweredByHeader: false,

    // 🕵️‍♂️ 反逆向工程：關閉 Source Maps
    productionBrowserSourceMaps: false
};

export default nextConfig;
