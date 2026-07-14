import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CasesWidgetLayout } from '../CasesWidgetLayout';
import { DEFAULT_CASES_LAYOUT } from '@/domain/cases/layoutTypes';

const mockHideWidget = jest.fn();
const mockShowWidget = jest.fn();
const mockReorderWidgets = jest.fn();
let mockLayout = DEFAULT_CASES_LAYOUT;

jest.mock('@/hooks/useCasesLayout', () => ({
    useCasesLayout: () => ({
        layout: mockLayout,
        isLoading: false,
        hideWidget: mockHideWidget,
        showWidget: mockShowWidget,
        reorderWidgets: mockReorderWidgets,
    }),
}));

jest.mock('@/components/features/cases/ExportExcelButton', () => ({
    __esModule: true,
    default: () => <div>匯出 Excel 按鈕內容</div>,
}));
jest.mock('@/components/features/cases/ExportHtmlButton', () => ({
    __esModule: true,
    default: () => <div>匯出 HTML 按鈕內容</div>,
}));
jest.mock('@/components/features/cases/CasesRapidInput', () => ({
    CasesRapidInput: () => <div>快速輸入列內容</div>,
}));
jest.mock('@/components/features/cases/CaseQuickNavigator', () => ({
    __esModule: true,
    default: () => <div>快速導航內容</div>,
}));
jest.mock('@/components/dashboard/GlobalPipelineChart', () => ({
    __esModule: true,
    default: () => <div>案件進度總覽內容</div>,
}));
jest.mock('@/components/dashboard/eisenhower/EisenhowerMatrix', () => ({
    __esModule: true,
    default: () => <div>輕重緩急看板內容</div>,
}));

const baseProps = {
    title: '案件管理中心',
    caseCount: 10,
    cases: [],
    monitoringCases: [],
    rapidInputCases: [],
    stageParam: undefined,
};

describe('CasesWidgetLayout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLayout = DEFAULT_CASES_LAYOUT;
    });

    it('渲染標題與案件計數徽章', () => {
        render(<CasesWidgetLayout {...baseProps} showMonitoringWidgets />);

        expect(screen.getByRole('heading', { name: '案件管理中心' })).toBeInTheDocument();
        expect(screen.getByText('10 TOTAL')).toBeInTheDocument();
    });

    it('隱藏板塊入口按鈕與標題同層渲染，不在板塊堆疊之後', () => {
        mockLayout = DEFAULT_CASES_LAYOUT.map((w) => (w.id === 'quick-navigator' ? { ...w, visible: false } : w));
        render(<CasesWidgetLayout {...baseProps} showMonitoringWidgets />);

        const heading = screen.getByRole('heading', { name: '案件管理中心' });
        const hiddenMenuButton = screen.getByRole('button', { name: /已隱藏區塊/ });
        // 標題與隱藏板塊入口按鈕應同層渲染在標題列（同一個直接父層）
        expect(heading.parentElement).toContainElement(hiddenMenuButton);
    });

    it('傳入 children（分頁列 + 搜尋欄）時，渲染於標題列與板塊堆疊之間', () => {
        render(
            <CasesWidgetLayout {...baseProps} showMonitoringWidgets>
                <div>分頁與搜尋列內容</div>
            </CasesWidgetLayout>
        );
        expect(screen.getByText('分頁與搜尋列內容')).toBeInTheDocument();
    });

    it('預設版面下依序渲染 5 個板塊', () => {
        render(<CasesWidgetLayout {...baseProps} showMonitoringWidgets />);

        expect(screen.getByText('匯出 Excel 按鈕內容')).toBeInTheDocument();
        expect(screen.getByText('匯出 HTML 按鈕內容')).toBeInTheDocument();
        expect(screen.getByText('快速輸入列內容')).toBeInTheDocument();
        expect(screen.getByText('快速導航內容')).toBeInTheDocument();
        expect(screen.getByText('案件進度總覽內容')).toBeInTheDocument();
        expect(screen.getByText('輕重緩急看板內容')).toBeInTheDocument();
    });

    it('showMonitoringWidgets=false 時不渲染 pipeline-chart/eisenhower-matrix，且不計入隱藏板塊清單', () => {
        render(<CasesWidgetLayout {...baseProps} showMonitoringWidgets={false} />);

        expect(screen.queryByText('案件進度總覽內容')).not.toBeInTheDocument();
        expect(screen.queryByText('輕重緩急看板內容')).not.toBeInTheDocument();
        // 不應該出現「隱藏板塊」入口按鈕，因為這兩個板塊是分頁不適用而非使用者主動隱藏
        expect(screen.queryByRole('button', { name: /已隱藏區塊/ })).not.toBeInTheDocument();
    });

    it('點擊板塊的 X 按鈕觸發 hideWidget', () => {
        render(<CasesWidgetLayout {...baseProps} showMonitoringWidgets />);

        const hideButtons = screen.getAllByRole('button', { name: '隱藏此區塊' });
        fireEvent.click(hideButtons[0]);
        expect(mockHideWidget).toHaveBeenCalledTimes(1);
    });

    it('使用者主動隱藏板塊時，隱藏板塊入口按鈕出現', () => {
        mockLayout = DEFAULT_CASES_LAYOUT.map((w) =>
            w.id === 'quick-navigator' ? { ...w, visible: false } : w
        );
        render(<CasesWidgetLayout {...baseProps} showMonitoringWidgets />);

        expect(screen.getByRole('button', { name: /已隱藏區塊/ })).toBeInTheDocument();
        expect(screen.queryByText('快速導航內容')).not.toBeInTheDocument();
    });
});
