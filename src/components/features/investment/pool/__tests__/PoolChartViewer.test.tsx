/**
 * Tests for PoolChartViewer (change: investment-pool-chart-view, task 2.2).
 * LazyBareKSlide is mocked; we assert on slide order, header text and props.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PoolChartViewer } from '../PoolChartViewer';

const mockSlide = jest.fn();
jest.mock('../LazyBareKSlide', () => ({
    LazyBareKSlide: (props: { code: string; strategies: string[] }) => {
        mockSlide(props);
        return <div data-testid={`slide-${props.code}`} />;
    },
}));

beforeAll(() => {
    class MockIntersectionObserver {
        observe() {}
        disconnect() {}
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver });
    Element.prototype.scrollIntoView = jest.fn();
    window.scrollTo = jest.fn();
});

beforeEach(() => mockSlide.mockClear());

const ROWS = [
    { code: '2330', name: '台積電', etfs: ['00981A', '00980A', '00991A'] },
    { code: '2454', name: '聯發科', etfs: ['00981A'] },
];

describe('PoolChartViewer', () => {
    it('標頭顯示持有 ETF 數，標籤傳入持有 ETF 代號', () => {
        render(<PoolChartViewer rows={ROWS} />);
        expect(screen.getByText('3 支 ETF 持有')).toBeInTheDocument();
        expect(screen.getByText('1 支 ETF 持有')).toBeInTheDocument();
        expect(mockSlide).toHaveBeenCalledWith(
            expect.objectContaining({ code: '2330', name: '台積電', strategies: ['00981A', '00980A', '00991A'] }),
        );
    });

    it('依 rows 順序渲染，返回連結指向 /investment', () => {
        const { container } = render(<PoolChartViewer rows={ROWS} />);
        const ids = Array.from(container.querySelectorAll('[data-testid^="slide-"]')).map((el) =>
            el.getAttribute('data-testid'),
        );
        expect(ids).toEqual(['slide-2330', 'slide-2454']);
        expect(container.querySelector('a[href="/investment"]')).not.toBeNull();
    });

    it('不顯示右側跳轉點（檔數過多會超出畫面）', () => {
        const rows = Array.from({ length: 5 }, (_, i) => ({ code: String(2330 + i), name: '', etfs: ['00981A'] }));
        render(<PoolChartViewer rows={rows} />);
        expect(screen.queryByRole('navigation', { name: '快速跳轉' })).not.toBeInTheDocument();
    });

    it('rows 為空時顯示目前沒有選股池股票', () => {
        render(<PoolChartViewer rows={[]} />);
        expect(screen.getByText('目前沒有選股池股票')).toBeInTheDocument();
    });
});
