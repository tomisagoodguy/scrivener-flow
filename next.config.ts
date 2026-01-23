import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    turbopack: {},

    // 🔒 Security Headers - 提升網站安全性評分
    // 注意：Content-Security-Policy (CSP) 已移至 src/middleware.ts 以支援動態 Nonce
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
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
