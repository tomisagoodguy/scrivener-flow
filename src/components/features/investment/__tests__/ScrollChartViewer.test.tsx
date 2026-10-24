/**
 * Tests for ScrollChartViewer / BareKScrollViewer
 * (openspec: fan-breakout-chart-crossref, tasks 1.1–1.2).
 * IntersectionObserver is mocked so tests can drive the active section.
 */

import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { ScrollChartViewer, type ScrollSlide } from '@/components/features/investment/ScrollChartViewer';
import { BareKScrollViewer, type StockSlide } from '@/components/features/investment/BareKScrollViewer';

jest.mock('@/components/features/investment/BareKChart', () => ({
    BareKChart: () => <div data-testid="bare-k-chart" />,
}));

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
let observerCallback: ObserverCallback | null = null;

beforeAll(() => {
    class MockIntersectionObserver {
        constructor(cb: ObserverCallback) {
            observerCallback = cb;
        }
        observe() {}
        disconnect() {}
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver });
    Element.prototype.scrollIntoView = jest.fn();
    window.scrollTo = jest.fn();
});

beforeEach(() => {
    observerCallback = null;
});

function makeSlides(n: number): ScrollSlide[] {
    return Array.from({ length: n }, (_, i) => ({ code: String(2330 + i), name: `股票${i}` }));
}

/** 模擬第 idx 個 section 標題進入視窗 */
function activate(idx: number) {
    const header = document.querySelector(`[data-idx="${idx}"]`);
    if (!header || !observerCallback) throw new Error('observer not ready');
    act(() => observerCallback?.([{ isIntersecting: true, target: header }]));
}

const renderSlide = (s: ScrollSlide) => <div data-testid={`slide-${s.code}`}>{s.code}</div>;

describe('ScrollChartViewer', () => {
    it('renders slide content only for the initial section and its neighbours', () => {
        render(<ScrollChartViewer slides={makeSlides(5)} initialIndex={0} renderSlide={renderSlide} />);
        expect(screen.getByTestId('slide-2330')).toBeInTheDocument();
        expect(screen.getByTestId('slide-2331')).toBeInTheDocument();
        expect(screen.queryByTestId('slide-2332')).not.toBeInTheDocument();
    });

    it('renders header extra content from renderHeaderExtra', () => {
        render(
            <ScrollChartViewer
                slides={makeSlides(2)}
                initialIndex={0}
                renderSlide={renderSlide}
                renderHeaderExtra={(s) => <span>extra-{s.code}</span>}
            />,
        );
        expect(screen.getByText('extra-2330')).toBeInTheDocument();
        expect(screen.getByText('extra-2331')).toBeInTheDocument();
    });

    it('uses a button with backLabel when onBack is given', () => {
        const onBack = jest.fn();
        render(
            <ScrollChartViewer
                slides={makeSlides(2)}
                initialIndex={0}
                renderSlide={renderSlide}
                onBack={onBack}
                backLabel="返回表格"
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /返回表格/ }));
        expect(onBack).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('link', { name: /返回/ })).not.toBeInTheDocument();
    });

    it('uses a link when only backHref is given', () => {
        render(
            <ScrollChartViewer slides={makeSlides(2)} initialIndex={0} renderSlide={renderSlide} backHref="/investment/strategy" />,
        );
        expect(screen.getByRole('link', { name: /返回/ })).toHaveAttribute('href', '/investment/strategy');
    });

    it('shows navigation dots only when there are more than 3 slides', () => {
        const { unmount } = render(<ScrollChartViewer slides={makeSlides(3)} initialIndex={0} renderSlide={renderSlide} />);
        expect(screen.queryByRole('navigation', { name: '快速跳轉' })).not.toBeInTheDocument();
        unmount();

        render(<ScrollChartViewer slides={makeSlides(4)} initialIndex={0} renderSlide={renderSlide} />);
        const dots = within(screen.getByRole('navigation', { name: '快速跳轉' })).getAllByRole('button');
        expect(dots).toHaveLength(4);
    });

    it('calls onActiveChange and renders neighbours when a section becomes active', () => {
        const onActiveChange = jest.fn();
        render(
            <ScrollChartViewer
                slides={makeSlides(5)}
                initialIndex={0}
                renderSlide={renderSlide}
                onActiveChange={onActiveChange}
            />,
        );
        activate(2);
        expect(onActiveChange).toHaveBeenCalledWith(expect.objectContaining({ code: '2332' }), 2);
        expect(screen.getByTestId('slide-2333')).toBeInTheDocument();
        expect(screen.getByText('3 / 5')).toBeInTheDocument();
    });
});

describe('BareKScrollViewer (bare-K watch page wrapper)', () => {
    function makeStockSlides(n: number): StockSlide[] {
        return makeSlides(n).map((s) => ({ ...s, strategies: [], snapshot: null }));
    }

    beforeEach(() => {
        jest.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('syncs the URL to /investment/bare-k/<code> by default', () => {
        render(<BareKScrollViewer slides={makeStockSlides(3)} initialIndex={0} />);
        activate(1);
        expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/investment/bare-k/2331');
    });

    it('does not touch the URL when disableHistoryUpdate is set', () => {
        render(<BareKScrollViewer slides={makeStockSlides(3)} initialIndex={0} disableHistoryUpdate />);
        activate(1);
        expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it('keeps the default back link to /investment/bare-k', () => {
        render(<BareKScrollViewer slides={makeStockSlides(1)} initialIndex={0} />);
        expect(screen.getByRole('link', { name: /返回/ })).toHaveAttribute('href', '/investment/bare-k');
    });
});
