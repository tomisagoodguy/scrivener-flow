/**
 * 辦事清單資料定義
 * 若需新增/修改項目，直接編輯此檔案即可，無需修改元件邏輯。
 */

// 所有已知前綴（用於辨識「未分類」項目）
export const ALL_KNOWN_PREFIXES = ['SIG_', 'SEAL_', 'LOAN_', 'TAX_', 'HO_', 'S_', 'T_'] as const;

// ─── 舊版二階段任務清單（快速瀏覽）───────────────────────────────

const OLD_SIGNING_TODOS = [
    '買方蓋印章', '賣方蓋印章', '用印款', '完稅款', '權狀', '印鑑',
    '授權', '解約排除', '規費', '設定', '等稅單', '已繳稅單', '差額', '整過戶',
] as const;

const OLD_TRANSFER_TODOS = [
    '整交屋', '實登', '打單', '履保', '水電', '稅費分算',
    '保單', '代償', '塗銷', '二撥',
] as const;

export const OLD_STAGES = [
    {
        key: 'old_sig',
        label: '簽約用印',
        prefix: 'S_',
        items: OLD_SIGNING_TODOS,
        color: 'border-slate-300/60 bg-slate-50/60 dark:border-slate-600/40 dark:bg-slate-800/30',
        badge: 'text-slate-500',
    },
    {
        key: 'old_trf',
        label: '過戶交屋',
        prefix: 'T_',
        items: OLD_TRANSFER_TODOS,
        color: 'border-slate-300/60 bg-slate-50/60 dark:border-slate-600/40 dark:bg-slate-800/30',
        badge: 'text-slate-500',
        catchUncategorized: false,
    },
] as const;

// ─── 新版五階段任務清單（詳細流程）───────────────────────────────

const SIGNING_ITEMS = ['確認通訊方式', '掃描文件', '送各項申請'] as const;

const SEALING_ITEMS = [
    '通知買方匯入用印款及預收規費',
    '確認用印款及預收規費有無匯入',
    '列印過戶及水電文件',
    '確認用印款達成條件是否達成',
    '約用印', '買方用印', '賣方用印',
] as const;

const LOAN_ITEMS = [
    '貸款預估', '請銀行約客戶寫貸款申請書', '確認貸款核准條件', '領設定文件',
    '預計過戶完成日確認代償金額', '通知銀行代償資料', '過戶完成通知撥款',
    '送他項權利登記', '追前手清償證明', '塗銷文件準備', '地政送塗銷',
    '送塗後謄本/過戶後謄本', '二撥進履保',
] as const;

const TAX_ITEMS = [
    '通知買方匯入完稅款', '確認完稅款有無匯入',
    '報稅（最後繳納日）：確認登記人後報稅',
    '整卷', '出款繳稅', '送地政過戶', '領件（領取權狀及新謄本）',
] as const;

const HANDOVER_ITEMS = [
    '交屋整理', '水電瓦斯過戶', '辦理交屋', '房地合一申報（30日內）', '結案',
] as const;

export const NEW_STAGES = [
    { key: 'sig',  label: '一、簽約階段', prefix: 'SIG_',  items: SIGNING_ITEMS,  color: 'border-blue-400/40 bg-blue-500/5',       badge: 'text-blue-500'   },
    { key: 'seal', label: '二、用印階段', prefix: 'SEAL_', items: SEALING_ITEMS,  color: 'border-purple-400/40 bg-purple-500/5',   badge: 'text-purple-500' },
    { key: 'loan', label: '三、貸款階段', prefix: 'LOAN_', items: LOAN_ITEMS,     color: 'border-amber-400/40 bg-amber-500/5',     badge: 'text-amber-600'  },
    { key: 'tax',  label: '四、完稅階段', prefix: 'TAX_',  items: TAX_ITEMS,      color: 'border-rose-400/40 bg-rose-500/5',       badge: 'text-rose-500'   },
    { key: 'ho',   label: '五、交屋階段', prefix: 'HO_',   items: HANDOVER_ITEMS, color: 'border-emerald-400/40 bg-emerald-500/5', badge: 'text-emerald-600', catchUncategorized: true },
] as const;
