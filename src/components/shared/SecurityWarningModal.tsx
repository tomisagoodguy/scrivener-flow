'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sf_security_warning_acknowledged';

export function SecurityWarningModal() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const acknowledged = localStorage.getItem(STORAGE_KEY);
        if (!acknowledged) {
            setVisible(true);
        }
    }, []);

    function handleAcknowledge() {
        localStorage.setItem(STORAGE_KEY, 'true');
        setVisible(false);
    }

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="security-warning-title"
        >
            <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-400/40 overflow-hidden">
                {/* 頂部警示色條 */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

                <div className="p-6 space-y-5">
                    {/* 圖示 + 標題 */}
                    <div className="flex items-center gap-3">
                        <span className="text-3xl select-none" aria-hidden>⚠️</span>
                        <h2
                            id="security-warning-title"
                            className="text-lg font-bold text-slate-800 dark:text-slate-100"
                        >
                            使用前請注意：隱私安全提醒
                        </h2>
                    </div>

                    {/* 警告內容 */}
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        <p>
                            本工具包含<strong className="text-amber-600 dark:text-amber-400">客戶敏感資料</strong>（案件資訊、聯絡資料等），請務必注意以下事項：
                        </p>
                        <ul className="space-y-2">
                            {[
                                '🏢 請勿在公司電腦或公司網路上使用此工具',
                                '👁 公司電腦可能有螢幕監控、鍵盤側錄或網路封包攔截',
                                '📱 建議改用個人手機（行動網路）存取',
                                '🔒 使用完畢請記得登出，避免資料外洩',
                                '☕ 咖啡廳等公共場所使用時，注意旁人是否可見螢幕',
                            ].map((item) => (
                                <li key={item} className="flex gap-2">
                                    <span className="shrink-0">{item.substring(0, 2)}</span>
                                    <span>{item.substring(2)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
                            此提示僅顯示一次。如需再次查看，請清除瀏覽器快取。
                        </p>
                    </div>

                    {/* 確認按鈕 */}
                    <button
                        onClick={handleAcknowledge}
                        className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white
                                   bg-gradient-to-r from-amber-500 to-orange-500
                                   hover:from-amber-400 hover:to-orange-400
                                   active:scale-[0.98] transition-all duration-150 shadow-md"
                    >
                        我了解，繼續使用（請勿在公司電腦操作）
                    </button>
                </div>
            </div>
        </div>
    );
}
