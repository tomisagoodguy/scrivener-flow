/**
 * TaiexRegimeCard（change: taiex-ma60-regime，spec「Regime card on the breadth page」）
 * 涵蓋：無資料空狀態、站上中顯示本波次數／門檻／下一次歸類與對應類別統計、免責文字。
 */
import { render, screen } from '@testing-library/react';
import TaiexRegimeCard from '../TaiexRegimeCard';
import type { TaiexClassStats, TaiexRegime } from '@/app/actions/getTaiexRegime';

const stats = (median: number, n: number): TaiexClassStats => ({
    n,
    next_day_up_rate: 0.5,
    median_r20: median,
    mean_r20: median,
    up_rate_r20: 0.58,
    back_above_within20: 71,
    median_min_low20: -0.026,
    count_min_low_below_5pct: 23,
    sample_start: '1999-07-16',
    sample_end: '2026-08-24',
});

const ABOVE: TaiexRegime = {
    date: '2026-10-16',
    close: 47111.26,
    ma60: 46055.78,
    ma60_slope20: 882.17,
    ma_rising: true,
    days_above: 36,
    break_type: null,
    state: 'above',
    wave_break_count: 5,
    next_break_threshold: 46076.63,
    next_break_type: 'rebreak_rising',
    stats: {
        first_break: stats(0.0213, 42),
        rebreak_rising: stats(0.0109, 91),
        down_day: { ...stats(0.0096, 3215), back_above_within20: null },
    },
};

describe('TaiexRegimeCard', () => {
    it('無資料顯示「季線狀態尚未更新」', () => {
        render(<TaiexRegimeCard data={null} />);
        expect(screen.getByText('季線狀態尚未更新')).toBeInTheDocument();
    });

    it('站上中顯示站上天數、本波次數、門檻與下一次歸類', () => {
        render(<TaiexRegimeCard data={ABOVE} />);
        expect(screen.getByText(/站上季線 36 日/)).toBeInTheDocument();
        expect(screen.getByText(/本波已跌破 5 次/)).toBeInTheDocument();
        expect(screen.getByText(/46,077/)).toBeInTheDocument();
        expect(screen.getAllByText(/季線上揚中再跌破/).length).toBeGreaterThan(0);
    });

    it('統計表對照該類（rebreak_rising）與收黑日基準，不顯示第一次跌破的數字', () => {
        render(<TaiexRegimeCard data={ABOVE} />);
        expect(screen.getByText('+1.09%')).toBeInTheDocument();
        expect(screen.getByText('+0.96%')).toBeInTheDocument();
        expect(screen.queryByText('+2.13%')).toBeNull();
        expect(screen.getByText(/n = 91/)).toBeInTheDocument();
    });

    it('固定顯示免責文字', () => {
        render(<TaiexRegimeCard data={ABOVE} />);
        expect(screen.getByText(/歷史統計，非預測或投資建議/)).toBeInTheDocument();
    });
});
