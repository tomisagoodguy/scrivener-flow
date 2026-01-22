import { ModernLogin } from './ModernLogin';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-blue-500 font-black animate-pulse uppercase tracking-widest">Initialising Secure Portal...</div>}>
            <ModernLogin />
        </Suspense>
    );
}
