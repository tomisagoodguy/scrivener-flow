'use client';

import { useAccessibility } from '@/hooks/useAccessibility';

interface Props {
    onClose: () => void;
}

export function AccessibilityPanel({ onClose }: Props) {
    const { fontScale, isHighContrast, setFontScale, toggleHighContrast } = useAccessibility();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative glass-card rounded-2xl p-6 w-80 shadow-2xl border border-white/50 bg-white/90 dark:bg-slate-900/90">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>♿</span>
                        無障礙設定
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="關閉無障礙設定"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    {/* 字體大小 */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">字體大小</p>
                            <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{Number(fontScale).toFixed(1)}×</span>
                        </div>
                        <input
                            type="range"
                            min={0.6}
                            max={1.2}
                            step={0.1}
                            value={Number(fontScale)}
                            onChange={(e) => setFontScale(parseFloat(e.target.value))}
                            className="w-full accent-blue-600"
                            aria-label="字體大小"
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-slate-400">0.6×</span>
                            <span className="text-xs text-slate-400">1.2×</span>
                        </div>
                    </div>

                    {/* 高對比模式 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">高對比模式</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">適合戶外強光環境</p>
                        </div>
                        <button
                            role="switch"
                            aria-checked={isHighContrast}
                            onClick={toggleHighContrast}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                isHighContrast ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                    isHighContrast ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                <p className="text-xs text-slate-400 text-center mt-4">偏好設定自動儲存</p>
            </div>
        </div>
    );
}
