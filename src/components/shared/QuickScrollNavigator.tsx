'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function QuickScrollNavigator() {
    const [showUp, setShowUp] = useState(false);
    const [showDown, setShowDown] = useState(false);
    const pathname = usePathname();

    // Whitelist of routes where this should appear based on user request
    const whitelist = ['/banks', '/redemptions', '/clauses', '/guidelines', '/knowledge', '/notes', '/investment'];
    const isWhitelisted = pathname === '/' || whitelist.some(route => pathname.startsWith(route));

    useEffect(() => {
        const update = () => {
            const scrollY = window.scrollY;
            const totalHeight = document.documentElement.scrollHeight;
            const viewHeight = window.innerHeight;
            setShowUp(scrollY > 400);
            setShowDown(totalHeight > viewHeight + 400 && scrollY + viewHeight < totalHeight - 400);
        };
        update();
        window.addEventListener('scroll', update);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    if (!isWhitelisted) return null;

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

    return (
        <div className="fixed bottom-8 right-8 z-100 flex flex-col gap-3">
            <AnimatePresence>
                {showUp && (
                    <motion.button
                        key="up"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={scrollToTop}
                        className="w-12 h-12 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-center group relative"
                        title="回到頂部"
                    >
                        <ChevronUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
                        <span className="absolute -left-16 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold">
                            回到頂部
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showDown && (
                    <motion.button
                        key="down"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={scrollToBottom}
                        className="w-12 h-12 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-center group relative"
                        title="捲到底部"
                    >
                        <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
                        <span className="absolute -left-16 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold">
                            捲到底部
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Back to Dashboard Button (only if not on dashboard) */}
            {pathname !== '/' && (
                <Link href="/">
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-[0_8px_30px_rgb(37,99,235,0.36)] flex items-center justify-center group relative border border-white/20"
                        title="返回儀表板"
                    >
                        <Home className="w-5 h-5" />
                        <span className="absolute -left-20 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold">
                            返回儀表板
                        </span>
                    </motion.div>
                </Link>
            )}
        </div>
    );
}
