import type { TaiexBreakType, TaiexRegimeState, TaiexStatsKey } from '@/app/actions/getTaiexRegime';

export const STATE_LABEL: Record<TaiexRegimeState, string> = {
    above: '站上季線',
    below_after_first_break: '第一次跌破後',
    below_after_rebreak: '季線上揚中再跌破後',
    below_ma_falling: '季線下彎中',
};

export const CLASS_LABEL: Record<TaiexStatsKey, string> = {
    first_break: '第一次跌破（季線上揚、前站上 ≥40 日）',
    rebreak_rising: '季線上揚中再跌破（前站上 <40 日）',
    break_falling: '季線下彎時跌破',
    down_day: '任一收黑日（基準）',
};

const BREAK_BY_STATE: Record<Exclude<TaiexRegimeState, 'above'>, TaiexBreakType> = {
    below_after_first_break: 'first_break',
    below_after_rebreak: 'rebreak_rising',
    below_ma_falling: 'break_falling',
};

/** 卡片要對照的事件類別：站上中看「若下一交易日跌破會是哪類」，跌破中看開啟這段跌破的那類。 */
export function relevantBreakClass(state: TaiexRegimeState, next: TaiexBreakType | null): TaiexBreakType | null {
    return state === 'above' ? next : BREAK_BY_STATE[state];
}

export function formatSignedPct(value: number | null): string {
    if (value == null) return '—';
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}
