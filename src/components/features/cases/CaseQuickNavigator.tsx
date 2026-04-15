'use client';

import { DemoCase } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface CaseQuickNavigatorProps {
    cases: DemoCase[];
}

export default function CaseQuickNavigator({ cases }: CaseQuickNavigatorProps) {
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToCase = (id: string) => {
        const element = document.getElementById(`case-${id}`);
        if (element) {
            // Align to start but with a scroll-margin-top set on the element
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Highlight effect
            element.classList.add('ring-4', 'ring-blue-500/40', 'dark:ring-blue-400/40', 'z-20', 'scale-[1.01]', 'shadow-2xl');
            setTimeout(() => {
                element.classList.remove('ring-4', 'ring-blue-500/40', 'dark:ring-blue-400/40', 'z-20', 'scale-[1.01]', 'shadow-2xl');
            }, 2000);
        }
    };

    if (cases.length === 0) return null;

    return (
        <>
            {/* Quick Jump Rail - Sticky at top of content flow */}
            <div className="sticky top-[95px] z-40 -mx-4 px-4 py-2 mt-4 mb-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-y border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-blue-500/20 rounded-full shrink-0 border border-white/10 dark:border-blue-500/20">
                        <span className="text-xs">⚡</span>
                        <span className="text-[10px] font-black text-white dark:text-blue-400 uppercase tracking-widest whitespace-nowrap">快速跳轉</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {cases.map((c, idx) => (
                            <motion.button
                                key={`nav-${c.id || idx}`}
                                whileHover={{ y: -1, scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => scrollToCase(c.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-lg transition-all duration-300 shrink-0 shadow-sm group"
                            >
                                <span className="text-[12px] font-bold truncate max-w-[120px] dark:text-slate-200 group-hover:dark:text-blue-400">
                                    {c.buyer_name} / {c.seller_name}
                                </span>
                                <span className="text-[10px] font-mono font-black text-slate-400 opacity-60">
                                    {c.case_number.slice(-3)}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Back to Top FAB - Fixed in bottom right */}
            <AnimatePresence>
                {showBackToTop && (
                    <motion.button
                        key="back-to-top"
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 50 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-8 right-8 z-100 w-12 h-12 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center border border-white/20 hover:bg-blue-700 pointer-events-auto"
                    >
                        <svg 
                            width="24" 
                            height="24" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </>
    );
}
