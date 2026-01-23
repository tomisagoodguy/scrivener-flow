'use client';

import React from 'react';

interface ImportLogsProps {
    logs: string[];
}

export function ImportLogs({ logs }: ImportLogsProps) {
    return (
        <div
            className="glass-card p-6 font-mono text-sm h-96 overflow-y-auto excel-scrollbar bg-white/40 animate-slide-up"
            style={{ animationDelay: '0.2s' }}
        >
            <h4 className="text-foreground font-bold mb-4 sticky top-0 bg-white/0 backdrop-blur-sm pb-2 border-b border-gray-200/50 flex items-center justify-between">
                <span>執行紀錄</span>
                <span className="text-xs text-slate-400 font-normal">System Console</span>
            </h4>
            {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <span>等待操作命令...</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map((log, i) => (
                        <div
                            key={i}
                            className="text-slate-700 border-l-2 border-primary/30 pl-3 py-1 hover:bg-white/30 rounded-r transition-colors"
                        >
                            <span className="text-primary-deep/60 text-xs font-bold mr-2 block mb-0.5">
                                [{new Date().toLocaleTimeString()}]
                            </span>
                            {log}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
