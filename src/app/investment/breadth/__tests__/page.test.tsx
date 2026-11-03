/**
 * /investment/breadth 頁面（change: taiex-ma60-regime，spec「Regime card on the breadth page」情境 No regime data）：
 * 季線狀態查無資料時，卡片顯示「季線狀態尚未更新」，ADL 圖照常渲染。
 */
import { render, screen } from '@testing-library/react';

jest.mock('@/app/actions/getAdlData', () => ({
    getAdlData: jest.fn(async () => ({
        records: [{ date: '2026-11-02', ups: 1, downs: 1, net: 0, adl: 100, adr: 0.5, adl_ma5: null, adl_ma60: null, adr_ma5: null, adr_ma60: null }],
        crossStatus: 'none',
        latestDate: '2026-11-02',
        latestAdl: 100,
    })),
}));
jest.mock('@/app/actions/getRetailSentiment', () => ({ getRetailSentiment: jest.fn(async () => null) }));
jest.mock('@/app/actions/getTaiexRegime', () => ({ getTaiexRegime: jest.fn(async () => null) }));
jest.mock('../components/AdlChart', () => ({
    __esModule: true,
    default: () => <div data-testid="adl-chart" />,
}));

import BreadthPage from '../page';

describe('BreadthPage', () => {
    it('季線狀態無資料時仍渲染 ADL 圖與空狀態卡片', async () => {
        render(await BreadthPage());
        expect(screen.getByTestId('adl-chart')).toBeInTheDocument();
        expect(screen.getByText('季線狀態尚未更新')).toBeInTheDocument();
    });
});
