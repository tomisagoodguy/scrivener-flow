'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scale, ChevronRight } from 'lucide-react';

interface BookCoverProps {
    isOpen: boolean;
    onClick: () => void;
}

export function BookCover({ isOpen, onClick }: BookCoverProps) {
    return (
        <motion.div
            className="absolute inset-0 z-20 cursor-pointer origin-left"
            animate={{ rotateY: isOpen ? -180 : 0 }}
            transition={{
                duration: 1.2,
                ease: [0.6, 0.05, -0.01, 0.9],
                type: "spring",
                stiffness: 45,
                damping: 15
            }}
            onClick={onClick}
            style={{
                transformStyle: 'preserve-3d',
                width: '100%',
                maxWidth: '440px',
            }}
        >
            {/* Front of Cover */}
            <div
                className="absolute inset-0 z-20 shadow-[20px_0_100px_rgba(0,0,0,0.15)] rounded-r-3xl overflow-hidden"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
                <div className="w-full h-full bg-[#0ea5e9] flex flex-col items-center justify-center text-center p-14 relative group overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.4)_0%,_transparent_50%)]" />

                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div
                            className="w-24 h-24 mb-12 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center relative"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                        >
                            <Scale className="w-10 h-10 text-blue-600" />
                            <div className="absolute -inset-1 border-2 border-white/50 rounded-[2.8rem] animate-ping opacity-20" />
                        </motion.div>

                        <h1 className="text-white font-black text-5xl tracking-tighter mb-4 filter drop-shadow-lg">
                            SCRIVENER<br />FLOW
                        </h1>
                        <p className="text-blue-100/60 text-xs font-black uppercase tracking-[0.5em] mb-16">Smart Case Ledger</p>

                        <motion.div className="flex flex-col items-center gap-2" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}>
                            <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">點擊翻開法律書</span>
                            <ChevronRight className="w-6 h-6 rotate-90 text-white/60" />
                        </motion.div>
                    </div>

                    <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-white/20 rounded-tr-xl" />
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-white/20 rounded-br-xl" />
                </div>
            </div>

            {/* Back of Cover */}
            <div
                className="absolute inset-0 z-10 bg-slate-50 rounded-l-3xl shadow-inner border border-slate-200/50"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-white opacity-50" />
            </div>
        </motion.div>
    );
}
