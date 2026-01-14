import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { SideNav } from "@/components/SideNav";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "不動產控案進度追蹤 | Case Tracker",
  description: "Real Estate Case Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased selection:bg-blue-500/20`}>
        <ThemeProvider>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-500">
            <SideNav />
            <main className="flex-1 lg:pl-32 min-h-screen relative">
              {/* Decorative Background Elements */}
              <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
              <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

              <Suspense fallback={<div className="h-16 w-full animate-pulse bg-slate-100 dark:bg-slate-800" />}>
                <Header />
              </Suspense>
              <div className="max-w-[1600px] mx-auto p-4 md:p-8 animate-fade-in relative z-10">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
