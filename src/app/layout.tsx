import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SideNav } from '@/components/layout/SideNav';
import { MainWrapper } from '@/components/layout/MainWrapper';
import { HeaderWrapper } from '@/components/layout/HeaderWrapper';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthGateProvider } from '@/components/shared/AuthGate';
import { SecurityWarningModal } from '@/components/shared/SecurityWarningModal';
import QuickScrollNavigator from '@/components/shared/QuickScrollNavigator';

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
});

const outfit = Outfit({
    variable: '--font-outfit',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: '不動產控案進度追蹤 | Case Tracker',
    description: 'Real Estate Case Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-TW" suppressHydrationWarning>
            <body className={`${inter.variable} ${outfit.variable} antialiased selection:bg-blue-500/20`} suppressHydrationWarning>
                <ThemeProvider>
                    <AuthGateProvider>
                        <SecurityWarningModal />
                        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-500">
                            <Toaster richColors position="top-center" />
                            <SideNav />
                            <MainWrapper>
                                {/* Decorative Background Elements */}
                                <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
                                <div
                                    className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 dark:bg-violet-500/3 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-slow"
                                    style={{ animationDelay: '2s' }}
                                ></div>

                                <HeaderWrapper />
                                <div className="w-full pr-4 md:pr-8 py-4 md:py-6 animate-fade-in relative z-10">
                                    {children}
                                </div>
                                <QuickScrollNavigator />
                            </MainWrapper>
                        </div>
                    </AuthGateProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
