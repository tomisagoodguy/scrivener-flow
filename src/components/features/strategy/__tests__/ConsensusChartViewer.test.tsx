/**
 * Tests for ConsensusChartViewer (change: strategy-consensus-chart-view, task 2.1).
 * LazyBareKSlide is mocked; we assert on slide order, header text, back link and empty state.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ConsensusChartViewer from '../ConsensusChartViewer';
import type { ConsensusParams, MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';

const mockSlide = jest.fn();
jest.mock('@/components/features/investment/pool/LazyBareKSlide', () => ({
    LazyBareKSlide: (props: { code: string; name: string; strategies: string[] }) => {
        mockSlide(props);
        return <div data-testid={`slide-${props.code}`} />;
    },
}));

jest.mock('next/link', () => {
    const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    );
    MockLink.displayName = 'MockLink';
    return MockLink;
});

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

const capital = { id: 'capital_layer', label: 'Capital Layer 多層籌碼選股' };
const trend = { id: 'trend_template', label: '趨勢樣板選股' };
const lowVol = { id: 'low_vol_alpha', label: '低波動' };

// 已依共選數遞減、代號遞增排序（spec Example: Slide order）
const LATEST_STOCKS: MultiConsensusEntry[] = [
    { stock_id: '2330', name: '台積電', count: 3, industry: '半導體', strategies: [capital, lowVol, trend] },
    { stock_id: '2454', name: '', count: 2, industry: '半導體', strategies: [capital, trend] },
    { stock_id: '3017', name: '奇鋐', count: 2, industry: '電腦週邊', strategies: [capital, trend] },
];

const LATEST: ConsensusParams = { minCount: 2, view: 'chart', window: 'latest' };
const HISTORY: ConsensusParams = { minCount: 3, view: 'chart', window: 7 };

function slideIds(container: HTMLElement): (string | null)[] {
    return Array.from(container.querySelectorAll('[data-testid^="slide-"]')).map((el) => el.getAttribute('data-testid'));
}

describe('ConsensusChartViewer', () => {
    it('依共選股順序渲染，名稱為空時用代號', () => {
        const { container } = render(<ConsensusChartViewer stocks={LATEST_STOCKS} params={LATEST} />);
        expect(slideIds(container)).toEqual(['slide-2330', 'slide-2454']);
        expect(mockSlide).toHaveBeenCalledWith(expect.objectContaining({ code: '2454', name: '2454' }));
    });

    it('圖表標籤傳策略簡稱', () => {
        render(<ConsensusChartViewer stocks={LATEST_STOCKS} params={LATEST} />);
        expect(mockSlide).toHaveBeenCalledWith(
            expect.objectContaining({ code: '2330', strategies: ['Capital …', '低波動', '趨勢樣板選股'] }),
        );
    });

    it('最新模式標頭顯示共選數與策略簡稱，不顯示最後日期', () => {
        render(<ConsensusChartViewer stocks={LATEST_STOCKS} params={LATEST} />);
        expect(screen.getByText('3 策略共選')).toBeInTheDocument();
        expect(screen.getByText('Capital … · 低波動 · 趨勢樣板選股')).toBeInTheDocument();
        expect(screen.queryByText(/^最後 /)).not.toBeInTheDocument();
    });

    it('近 N 天模式標頭加最後選中日期', () => {
        const stocks: MultiConsensusEntry[] = [
            { stock_id: '2330', name: '台積電', count: 3, industry: '半導體', strategies: [capital, lowVol, trend], lastDate: '2026-10-28' },
        ];
        render(<ConsensusChartViewer stocks={stocks} params={HISTORY} />);
        expect(screen.getByText('3 策略共選')).toBeInTheDocument();
        expect(screen.getByText('最後 10/28')).toBeInTheDocument();
    });

    it('返回連結保留 cmin / cwin 並回到列表', () => {
        const { container } = render(<ConsensusChartViewer stocks={LATEST_STOCKS} params={HISTORY} />);
        expect(container.querySelector('a[href="/investment/strategy?cmin=3&cwin=7"]')).not.toBeNull();
    });

    it('不顯示右側跳轉點', () => {
        render(<ConsensusChartViewer stocks={LATEST_STOCKS} params={LATEST} />);
        expect(screen.queryByRole('navigation', { name: '快速跳轉' })).not.toBeInTheDocument();
    });

    it('無共選股時顯示空狀態且不渲染圖表', () => {
        const { container } = render(<ConsensusChartViewer stocks={[]} params={LATEST} />);
        expect(screen.getByText('目前條件下無共選股')).toBeInTheDocument();
        expect(slideIds(container)).toEqual([]);
        expect(mockSlide).not.toHaveBeenCalled();
    });
    it('門檻或時間窗改變時重建檢視器，回到第 1 檔', () => {
        const { container, rerender } = render(<ConsensusChartViewer stocks={LATEST_STOCKS} params={LATEST} />);
        // 模擬捲到第 3 檔：觸發標題 div 的 IntersectionObserver
        const header = container.querySelector('[data-idx="2"]') as Element;
        act(() => {
            observerCallbacks.forEach((cb) =>
                cb([{ isIntersecting: true, target: header } as unknown as IntersectionObserverEntry], {} as IntersectionObserver),
            );
        });
        expect(screen.getByText('3 / 3')).toBeInTheDocument();

        rerender(<ConsensusChartViewer stocks={LATEST_STOCKS.slice(0, 2)} params={{ ...LATEST, minCount: 3 }} />);
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
});
