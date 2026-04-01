// 時程總覽 — 統一事件類型與常數定義

export type EventCategory = 'milestone' | 'appointment' | 'tax_deadline' | 'todo';
export type EventShape = 'square' | 'circle' | 'triangle' | 'pill';

export interface TimelineEvent {
    id: string;
    caseId: string;
    caseNumber: string;
    buyerName: string;
    sellerName: string;
    date: Date;
    category: EventCategory;
    key: string;         // e.g. 'seal_date', 'tax_appointment'
    label: string;       // e.g. '用印', '完稅約客'
    icon: string;        // emoji
    color: string;       // tailwind bg class
    textColor: string;   // tailwind text class
    shape: EventShape;
    isCompleted: boolean;
    content?: string;    // 額外說明 (for todos)
}

/** 日期分組後的結構 */
export interface DayGroup {
    date: Date;
    dateKey: string;     // yyyy-MM-dd
    events: TimelineEvent[];
    isToday: boolean;
    isWeekend: boolean;
}

// ── 事件來源定義 ──────────────────────────────────────────────────────────────

export const MILESTONE_FIELDS = [
    { key: 'contract_date', label: '簽約', icon: '✍️', bg: 'bg-blue-500', text: 'text-blue-600', lightBg: 'bg-blue-50' },
    { key: 'sign_diff_date', label: '簽差', icon: '📝', bg: 'bg-blue-400', text: 'text-blue-500', lightBg: 'bg-blue-50' },
    { key: 'seal_date', label: '用印', icon: '🔏', bg: 'bg-indigo-500', text: 'text-indigo-600', lightBg: 'bg-indigo-50' },
    { key: 'tax_payment_date', label: '完稅', icon: '💰', bg: 'bg-emerald-500', text: 'text-emerald-600', lightBg: 'bg-emerald-50' },
    { key: 'transfer_date', label: '過戶', icon: '🏠', bg: 'bg-purple-500', text: 'text-purple-600', lightBg: 'bg-purple-50' },
    { key: 'balance_payment_date', label: '尾款', icon: '💵', bg: 'bg-amber-500', text: 'text-amber-600', lightBg: 'bg-amber-50' },
    { key: 'handover_date', label: '交屋', icon: '🔑', bg: 'bg-red-500', text: 'text-red-600', lightBg: 'bg-red-50' },
    { key: 'fee_precollect_date', label: '預收規費', icon: '📋', bg: 'bg-cyan-500', text: 'text-cyan-600', lightBg: 'bg-cyan-50' },
    { key: 'redemption_date', label: '清償', icon: '🏦', bg: 'bg-orange-500', text: 'text-orange-600', lightBg: 'bg-orange-50' },
    { key: 'tax_filing_date', label: '申報', icon: '📄', bg: 'bg-teal-500', text: 'text-teal-600', lightBg: 'bg-teal-50' },
] as const;

export const APPOINTMENT_FIELDS = [
    { key: 'sign_appointment', label: '簽約約客', icon: '🤝', bg: 'bg-blue-100', text: 'text-blue-700', lightBg: 'bg-blue-50' },
    { key: 'seal_appointment', label: '用印約客', icon: '🤝', bg: 'bg-indigo-100', text: 'text-indigo-700', lightBg: 'bg-indigo-50' },
    { key: 'tax_appointment', label: '完稅約客', icon: '🤝', bg: 'bg-emerald-100', text: 'text-emerald-700', lightBg: 'bg-emerald-50' },
    { key: 'handover_appointment', label: '交屋約客', icon: '🤝', bg: 'bg-red-100', text: 'text-red-700', lightBg: 'bg-red-50' },
] as const;

export const TAX_DEADLINE_FIELDS = [
    { key: 'land_value_tax_deadline', label: '土增稅限繳', icon: '⏰', bg: 'bg-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-50' },
    { key: 'deed_tax_deadline', label: '契稅限繳', icon: '⏰', bg: 'bg-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-50' },
    { key: 'land_tax_deadline', label: '地價稅限繳', icon: '⏰', bg: 'bg-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-50' },
    { key: 'house_tax_deadline', label: '房屋稅限繳', icon: '⏰', bg: 'bg-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-50' },
] as const;

/** 事件類別 filter 用 */
export const EVENT_CATEGORIES: { id: EventCategory; label: string; icon: string }[] = [
    { id: 'milestone', label: '里程碑', icon: '■' },
    { id: 'appointment', label: '約客', icon: '●' },
    { id: 'tax_deadline', label: '稅單截止', icon: '▲' },
    { id: 'todo', label: '待辦', icon: '📝' },
];
