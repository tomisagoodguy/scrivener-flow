import { act, render, screen } from '@testing-library/react';
import { DWELL_MS, LazyBareKSlide } from '../LazyBareKSlide';
import { getStrategySnapshots } from '@/app/actions/getStrategySnapshots';

jest.mock('@/app/actions/getStrategySnapshots', () => ({
    getStrategySnapshots: jest.fn(),
}));

jest.mock('@/components/features/investment/BareKChart', () => ({
    BareKChart: ({ stockName, strategies }: { stockName: string; strategies: string[] }) => (
        <div data-testid="bare-k-chart">
            {stockName}|{strategies.join(',')}
        </div>
    ),
}));

const mockGet = getStrategySnapshots as jest.MockedFunction<typeof getStrategySnapshots>;
const SNAPSHOT = { stock_id: '2330', date: '2026-10-27' } as never;

// 可手動觸發進出視窗的 IntersectionObserver mock
let ioCallback: IntersectionObserverCallback | null = null;
const disconnect = jest.fn();
beforeAll(() => {
    class MockIntersectionObserver {
        constructor(cb: IntersectionObserverCallback) {
            ioCallback = cb;
        }
        observe() {}
        disconnect() {
            disconnect();
        }
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver });
});

function setInView(isIntersecting: boolean) {
    act(() => {
        ioCallback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
}

function advance(ms: number) {
    act(() => {
        jest.advanceTimersByTime(ms);
    });
}

function renderSlide(strategies: string[] = ['00981A']) {
    return render(<LazyBareKSlide code="2330" name="台積電" strategies={strategies} />);
}

describe('LazyBareKSlide', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockGet.mockReset();
        disconnect.mockClear();
        ioCallback = null;
    });
    afterEach(() => jest.useRealTimers());

    it('DWELL_MS 為 300', () => {
        expect(DWELL_MS).toBe(300);
    });

    describe('dwell timing', () => {
        beforeEach(() => mockGet.mockReturnValue(new Promise(() => {})));

        it('進入後 299ms 離開 → 0 次請求', () => {
            renderSlide();
            setInView(true);
            advance(299);
            setInView(false);
            advance(1000);
            expect(mockGet).not.toHaveBeenCalled();
        });

        it('進入停留 300ms → 1 次請求，以該檔代號呼叫', () => {
            renderSlide();
            setInView(true);
            advance(300);
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledWith(['2330']);
        });

        it('停留 300ms 後離開再進入停留 300ms → 仍為 1 次', () => {
            renderSlide();
            setInView(true);
            advance(300);
            setInView(false);
            setInView(true);
            advance(300);
            expect(mockGet).toHaveBeenCalledTimes(1);
        });

        it('從未進入視窗 → 0 次請求', () => {
            renderSlide();
            advance(5000);
            expect(mockGet).not.toHaveBeenCalled();
        });
    });

    it('請求前後皆顯示骨架直到結果回來', () => {
        mockGet.mockReturnValue(new Promise(() => {}));
        renderSlide();
        expect(screen.getByTestId('lazy-bare-k-loading')).toBeInTheDocument();
        setInView(true);
        advance(300);
        expect(screen.getByTestId('lazy-bare-k-loading')).toBeInTheDocument();
    });

    it('取得快照後渲染裸K圖並帶入 ETF 標籤', async () => {
        mockGet.mockResolvedValue(new Map([['2330', SNAPSHOT]]));
        renderSlide(['00981A', '00980A']);
        setInView(true);
        advance(300);
        expect(await screen.findByTestId('bare-k-chart')).toHaveTextContent('台積電|00981A,00980A');
        expect(screen.queryByTestId('lazy-bare-k-loading')).not.toBeInTheDocument();
    });

    it('無快照時顯示尚未同步文案', async () => {
        mockGet.mockResolvedValue(new Map([['2330', null]]));
        renderSlide([]);
        setInView(true);
        advance(300);
        expect(
            await screen.findByText('此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新'),
        ).toBeInTheDocument();
    });

    it('請求失敗時顯示圖表載入失敗並 console.error', async () => {
        const err = new Error('boom');
        mockGet.mockRejectedValue(err);
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        renderSlide([]);
        setInView(true);
        advance(300);
        expect(await screen.findByText('圖表載入失敗')).toBeInTheDocument();
        expect(spy).toHaveBeenCalledWith('[LazyBareKSlide]', '2330', err);
        spy.mockRestore();
    });

    it('卸載時斷開 observer 且未到期的計時不再發請求', () => {
        mockGet.mockReturnValue(new Promise(() => {}));
        const { unmount } = renderSlide();
        setInView(true);
        advance(100);
        unmount();
        advance(1000);
        expect(disconnect).toHaveBeenCalled();
        expect(mockGet).not.toHaveBeenCalled();
    });
});
