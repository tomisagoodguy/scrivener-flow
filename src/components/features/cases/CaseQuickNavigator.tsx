'use client';

import { DemoCase, Milestone } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

function getNextMilestoneLabel(c: DemoCase): string | null {
    const m = c.milestones?.[0] as Milestone | undefined;
    if (!m) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const steps = [
        { label: '簽', date: m.contract_date },
        { label: '印', date: m.seal_date },
        { label: '稅', date: m.tax_payment_date },
        { label: '過', date: m.transfer_date },
        { label: '交', date: m.handover_date },
    ];
    const upcoming = steps
        .filter((s) => s.date)
        .map((s) => ({ ...s, time: new Date(s.date!).getTime() }))
        .filter((s) => s.time >= today.getTime())
        .sort((a, b) => a.time - b.time)[0];
    if (!upcoming) return null;
    const d = new Date(upcoming.date!);
    return `${upcoming.label} ${d.getMonth() + 1}/${d.getDate()}`;
}

interface CaseQuickNavigatorProps {
    cases: DemoCase[];
}

export default function CaseQuickNavigator({ cases }: CaseQuickNavigatorProps) {
    const [showBackToTop, setShowBackToTop] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftMask, setShowLeftMask] = useState(false);
    const [showRightMask, setShowRightMask] = useState(false);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftMask(scrollLeft > 10);
        setShowRightMask(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        
        // Initial scroll check
        checkScroll();
        
        // Re-check on window resize
        window.addEventListener('resize', checkScroll);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, []);

    // Re-check when cases change (e.g. after filtering)
    useEffect(() => {
        const timer = setTimeout(checkScroll, 100);
        return () => clearTimeout(timer);
    }, [cases]);

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

    const sortedCases = [...cases].sort((a, b) => {
        const getTime = (c: DemoCase) => {
            const m = c.milestones?.[0] as Milestone | undefined;
            if (!m) return Infinity;
            const today = Date.now();
            const dates = [m.seal_date, m.tax_payment_date, m.transfer_date, m.handover_date]
                .filter(Boolean)
                .map((d) => new Date(d!).getTime())
                .filter((t) => t >= today)
                .sort((x, y) => x - y);
            return dates[0] ?? Infinity;
        };
        return getTime(a) - getTime(b);
    });

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
                    
                    <div className="relative flex-1 overflow-hidden">
                        {/* Edge Masks */}
                        <AnimatePresence>
                            {showLeftMask && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-linear-to-r from-white dark:from-slate-900 to-transparent" 
                                />
                            )}
                            {showRightMask && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-linear-to-l from-white dark:from-slate-900 to-transparent" 
                                />
                            )}
                        </AnimatePresence>

                        <div 
                            ref={scrollRef}
                            onScroll={checkScroll}
                            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
                        >
                            {sortedCases.slice(0, 30).map((c, idx) => {
                                const milestoneLabel = getNextMilestoneLabel(c);
                                return (
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
                                        {milestoneLabel && (
                                            <span className="text-[11px] font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                                {milestoneLabel}
                                            </span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
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
