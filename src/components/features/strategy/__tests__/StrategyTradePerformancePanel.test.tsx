/**
 * StrategyTradePerformancePanel 測試（change: strategy-trade-performance, task 5.1）
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import StrategyTradePerformancePanel from '../StrategyTradePerformancePanel';
import type { StrategyTrade } from '@/lib/investment/strategyTradeUtils';

function trade(overrides: Partial<StrategyTrade>): StrategyTrade {
    return {
        strategyId: 'trend_template',
        stockId: '0000',
        name: null,
        industry: null,
        entrySignalDate: '2026-10-01',
        entryDate: '2026-10-02',
        entryPrice: 100,
        exitDate: null,
        exitPrice: null,
        latestDate: '2026-10-30',
        holdingReturn: null,
        postExitReturn: null,
        ...overrides,
    };
}

const LABELS = { trend_template: '趨勢樣板選股', capital_layer: 'Capital Layer 多層籌碼選股' };

const TRADES: StrategyTrade[] = [
    trade({ stockId: '2330', name: '台積電', industry: '半導體', holdingReturn: 0.1 }),
    trade({ stockId: '2454', name: '聯發科', industry: '半導體', holdingReturn: 0.04 }),
    trade({ stockId: '2603', name: '長榮', industry: '航運', holdingReturn: -0.06, strategyId: 'capital_layer' }),
    trade({ stockId: '3017', name: '奇鋐', industry: '電腦週邊', entryDate: null, entryPrice: null }),
    trade({ stockId: '2317', name: '鴻海', industry: '電子', exitDate: '2026-10-01', holdingReturn: 0.12, postExitReturn: 0.05 }),
];

function renderPanel(trades: StrategyTrade[] = TRADES) {
    return render(<StrategyTradePerformancePanel trades={trades} asOf="2026-10-30" strategyLabels={LABELS} />);
}

describe('StrategyTradePerformancePanel', () => {
    it('「全部」摘要：持有中 3 檔、平均 2.67%、勝率 66.7%；待進場不入統計', () => {
        renderPanel();
        const summary = screen.getByTestId('trade-summary');
        expect(within(summary).getByText('3 檔')).toBeInTheDocument();
        expect(within(summary).getByText('2.67%')).toBeInTheDocument();
        expect(within(summary).getByText('66.7%')).toBeInTheDocument();
        expect(within(screen.getByTestId('trade-pending')).getByText('3017')).toBeInTheDocument();
    });

    it('正報酬遞減、負報酬遞增，台股紅漲綠跌', () => {
        renderPanel();
        const positive = screen.getByTestId('trade-positive');
        const codes = within(positive).getAllByTestId('trade-code').map((el) => el.textContent);
        expect(codes).toEqual(['2330', '2454']);
        expect(within(positive).getByText('10.00%')).toHaveClass('text-rose-600');
        const negative = screen.getByTestId('trade-negative');
        expect(within(negative).getByText('-6.00%')).toHaveClass('text-emerald-600');
    });

    it('全部模式每列標策略簡稱', () => {
        renderPanel();
        const negative = screen.getByTestId('trade-negative');
        expect(within(negative).getByText('Capital …')).toBeInTheDocument();
    });

    it('產業彙總依平均報酬遞減', () => {
        renderPanel();
        const rows = within(screen.getByTestId('trade-industry')).getAllByRole('row').slice(1);
        expect(rows.map((r) => (r as HTMLTableRowElement).cells[0].textContent)).toEqual(['半導體', '航運']);
        expect(within(rows[0]).getByText('7.00%')).toBeInTheDocument();
    });

    it('近期換出顯示持有報酬與換出後報酬', () => {
        renderPanel();
        const exits = screen.getByTestId('trade-exits');
        expect(within(exits).getByText('2317')).toBeInTheDocument();
        expect(within(exits).getByText('12.00%')).toHaveClass('text-rose-600');
        expect(within(exits).getByText('5.00%')).toHaveClass('text-rose-600');
    });

    it('切換單一策略後只顯示該策略', () => {
        renderPanel();
        fireEvent.click(screen.getByRole('button', { name: 'Capital …' }));
        expect(screen.queryByText('2330')).not.toBeInTheDocument();
        expect(within(screen.getByTestId('trade-negative')).getByText('2603')).toBeInTheDocument();
        expect(within(screen.getByTestId('trade-summary')).getByText('1 檔')).toBeInTheDocument();
    });

    it('報酬 0 顯示灰色、null 顯示「—」', () => {
        renderPanel([
            trade({ stockId: '1101', holdingReturn: 0 }),
            trade({ stockId: '1102', exitDate: '2026-10-20', holdingReturn: null, postExitReturn: null }),
        ]);
        expect(within(screen.getByTestId('trade-negative')).getByText('0.00%')).toHaveClass('text-gray-500');
        expect(within(screen.getByTestId('trade-exits')).getAllByText('—').length).toBeGreaterThan(0);
    });

    it('顯示計算方式說明', () => {
        renderPanel();
        expect(screen.getByText(/自換股訊號隔日開盤起算/)).toBeInTheDocument();
    });

    it('無資料時顯示空狀態', () => {
        renderPanel([]);
        expect(screen.getByText('尚無換股後表現資料')).toBeInTheDocument();
    });
    it('全部模式的近期換出與待進場也標策略簡稱，單一策略模式不標', () => {
        renderPanel();
        expect(within(screen.getByTestId('trade-exits')).getByText('趨勢樣板選股')).toBeInTheDocument();
        expect(within(screen.getByTestId('trade-pending')).getByText('趨勢樣板選股')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '趨勢樣板選股' }));
        expect(within(screen.getByTestId('trade-exits')).queryByText('趨勢樣板選股')).not.toBeInTheDocument();
    });
});
