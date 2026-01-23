'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AppleAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AppleAuthModal({ isOpen, onClose }: AppleAuthModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white rounded-[40px] shadow-2xl p-12 max-w-sm w-full text-center">
                        <button onClick={onClose} className="absolute top-8 right-8 p-1 text-slate-300 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner relative">
                            <svg className="w-10 h-10 text-slate-800 fill-current" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 3.87-.74c.51.01.69.05 2.01.59-1.74 1.16-1.53 4.6.61 5.48-.12.63-.26 1.19-.51 1.69-.6.18-1 1.16-1.06 1.21zM11.99 5.32c-.05.16-.1.32-.17.47-.58 1.18-1.5 1.57-2.05 1.48-.16-1.58.74-2.81 1.6-3.4 1.29-.98 2.65-.63 2.81-.59.04 1.22-.56 2.03-2.19 2.04z" />
                            </svg>
                            <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-black border-4 border-white">!</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter">系統支援中</h3>
                        <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed">為了確保加密機制的一致性，<br />請優先使用團隊指定的授權途徑：<br /><span className="text-blue-600 font-bold">Google Workspace Auth</span></p>
                        <button onClick={onClose} className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-200">了解並返回</button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
