/**
 * TradeWinnersChartViewer 測試（change: strategy-trade-winners-chart, task 3.1）
 * LazyBareKSlide 以 mock 取代；斷言順序、去重、標頭、持有標記與空狀態。
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TradeWinnersChartViewer from '../TradeWinnersChartViewer';
import type { StrategyHoldingMarks, StrategyTrade } from '@/lib/investment/strategyTradeUtils';

const mockSlide = jest.fn();
jest.mock('@/components/features/investment/pool/LazyBareKSlide', () => ({
    LazyBareKSlide: (props: { code: string; name: string; strategies: string[]; holdingMarks?: StrategyHoldingMarks }) => {
        mockSlide(props);
        return <div data-testid={`slide-${props.code}`} />;
    },
}));

let observerCallbacks: IntersectionObserverCallback[] = [];

beforeAll(() => {
    class MockIntersectionObserver {
        constructor(cb: IntersectionObserverCallback) {
            observerCallbacks.push(cb);
        }
        observe() {}
        disconnect() {}
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver });
    Element.prototype.scrollIntoView = jest.fn();
    window.scrollTo = jest.fn();
});

beforeEach(() => {
    mockSlide.mockClear();
    observerCallbacks = [];
});

function trade(overrides: Partial<StrategyTrade>): StrategyTrade {
    return {
        strategyId: 'trend_template',
        stockId: '0000',
        name: null,
        industry: null,
        entrySignalDate: '2026-10-01',
        entryDate: '2026-10-01',
        entryPrice: 100,
        exitDate: null,
        exitPrice: null,
        latestDate: '2026-10-21',
        holdingReturn: null,
        postExitReturn: null,
        ...overrides,
    };
}

const SHORT = { trend_template: '趨勢樣板', capital_layer: 'Capital …' };

// spec Example: ordering → 2317, 2330, 2454
const TRADES: StrategyTrade[] = [
    trade({ stockId: '2330', name: '台積電', holdingReturn: 0.12 }),
    trade({ stockId: '2317', name: '鴻海', holdingReturn: 0.3 }),
    trade({ stockId: '2454', name: '聯發科', holdingReturn: 0.12 }),
    trade({ stockId: '2330', name: '台積電', holdingReturn: 0.05, strategyId: 'capital_layer', entryDate: '2026-09-15' }),
    trade({ stockId: '2603', name: '長榮', holdingReturn: -0.06 }),
];

function slideIds(container: HTMLElement): (string | null)[] {
    return Array.from(container.querySelectorAll('[data-testid^="slide-"]')).map((el) => el.getAttribute('data-testid'));
}

function renderViewer(trades: StrategyTrade[] = TRADES) {
    return render(<TradeWinnersChartViewer trades={trades} strategyShortLabels={SHORT} resetKey="all" onBack={jest.fn()} />);
}

describe('TradeWinnersChartViewer', () => {
    it('依最高報酬遞減，同股只出現一次（首屏渲染第 1、2 檔）', () => {
        const { container } = renderViewer();
        expect(slideIds(container)).toEqual(['slide-2317', 'slide-2330']);
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('標頭顯示紅色報酬與持有天數', () => {
        renderViewer();
        expect(screen.getByText('30.00%')).toHaveClass('text-rose-600');
        expect(screen.getAllByText('20 天').length).toBeGreaterThan(0);
    });

    it('「全部」模式標頭列出正報酬策略簡稱（依報酬遞減）', () => {
        renderViewer();
        expect(screen.getByText('趨勢樣板 · Capital …')).toBeInTheDocument();
    });

    it('單一策略模式不顯示策略簡稱', () => {
        render(<TradeWinnersChartViewer trades={TRADES} resetKey="trend_template" onBack={jest.fn()} />);
        expect(screen.queryByText('趨勢樣板 · Capital …')).not.toBeInTheDocument();
        expect(mockSlide).toHaveBeenCalledWith(expect.objectContaining({ code: '2317', strategies: [] }));
    });

    it('持有標記涵蓋該股範圍內全部 trades', () => {
        renderViewer();
        expect(mockSlide).toHaveBeenCalledWith(
            expect.objectContaining({
                code: '2330',
                holdingMarks: expect.objectContaining({ entryDates: ['2026-09-15', '2026-10-01'] }),
            }),
        );
    });

    it('返回鍵呼叫 onBack', () => {
        const onBack = jest.fn();
        render(<TradeWinnersChartViewer trades={TRADES} resetKey="all" onBack={onBack} />);
        fireEvent.click(screen.getByRole('button', { name: /返回列表/ }));
        expect(onBack).toHaveBeenCalled();
    });

    it('resetKey 改變時重建檢視器，回到新範圍第 1 檔', () => {
        const { container, rerender } = render(
            <TradeWinnersChartViewer trades={TRADES} strategyShortLabels={SHORT} resetKey="all" onBack={jest.fn()} />,
        );
        // 模擬捲到第 3 檔：觸發標題 div 的 IntersectionObserver
        const header = container.querySelector('[data-idx="2"]') as Element;
        act(() => {
            observerCallbacks.forEach((cb) =>
                cb([{ isIntersecting: true, target: header } as unknown as IntersectionObserverEntry], {} as IntersectionObserver),
            );
        });
        expect(screen.getByText('3 / 3')).toBeInTheDocument();

        const capitalOnly = TRADES.filter((t) => t.strategyId === 'capital_layer');
        rerender(<TradeWinnersChartViewer trades={capitalOnly} resetKey="capital_layer" onBack={jest.fn()} />);
        expect(screen.getByText('1 / 1')).toBeInTheDocument();
        expect(slideIds(container)).toEqual(['slide-2330']);
    });

        it('無正報酬持有股時顯示空狀態且不渲染圖表', () => {
        const { container } = renderViewer([trade({ stockId: '2603', holdingReturn: -0.06 }), trade({ holdingReturn: 0 })]);
        expect(screen.getByText('目前無正報酬持有股')).toBeInTheDocument();
        expect(slideIds(container)).toEqual([]);
    });
});
