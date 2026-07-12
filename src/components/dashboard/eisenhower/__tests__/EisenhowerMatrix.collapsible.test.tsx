import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EisenhowerMatrix from '../EisenhowerMatrix';

const mockCases = [
    { id: 'A', case_number: 'C-A', buyer_name: '王小明', seller_name: '陳大文', status: 'Processing' },
];

function createQueryBuilder() {
    const builder = {
        select: jest.fn(),
        neq: jest.fn(),
        then: (resolve: (value: { data: typeof mockCases; error: null }) => unknown) =>
            resolve({ data: mockCases, error: null }),
    };
    builder.select.mockReturnValue(builder);
    builder.neq.mockReturnValue(builder);
    return builder;
}

const mockGetMatrix = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ from: () => createQueryBuilder() }),
}));

jest.mock('@/app/actions/eisenhowerActions', () => ({
    getEisenhowerMatrix: (...args: unknown[]) => mockGetMatrix(...args),
    saveEisenhowerMatrix: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/hooks/useNotification', () => ({
    useNotification: () => ({ error: jest.fn(), success: jest.fn() }),
}));

describe('EisenhowerMatrix — collapsible props（design: 以 props 擴充既有元件）', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetMatrix.mockResolvedValue({
            zones: [
                { id: 'q1', label: '重要且緊急' },
                { id: 'q2', label: '重要不緊急' },
                { id: 'q3', label: '緊急不重要' },
                { id: 'q4', label: '不重要不緊急' },
            ],
            placements: {},
        });
    });

    it('不傳 props（首頁用法）時：無收合按鈕，矩陣本體一律可見', async () => {
        render(<EisenhowerMatrix />);
        await waitFor(() => expect(screen.getByText(/待分類/)).toBeInTheDocument());

        expect(screen.queryByRole('button', { name: /收合|展開/ })).not.toBeInTheDocument();
        expect(screen.getByText('王小明')).toBeInTheDocument();
    });

    it('collapsible + defaultCollapsed 時：初始只見標題列，展開後本體出現', async () => {
        render(<EisenhowerMatrix collapsible defaultCollapsed />);

        // 標題可見，但矩陣本體（待分類 / 姓名）尚未顯示
        await waitFor(() => expect(screen.getByText('輕重緩急看板')).toBeInTheDocument());
        expect(screen.queryByText(/待分類/)).not.toBeInTheDocument();
        expect(screen.queryByText('王小明')).not.toBeInTheDocument();

        const toggle = screen.getByRole('button', { name: /展開/ });
        fireEvent.click(toggle);

        await waitFor(() => expect(screen.getByText(/待分類/)).toBeInTheDocument());
        expect(screen.getByText('王小明')).toBeInTheDocument();
    });

    it('collapsible 但 defaultCollapsed 省略（預設 false）時：本體預設可見', async () => {
        render(<EisenhowerMatrix collapsible />);
        await waitFor(() => expect(screen.getByText(/待分類/)).toBeInTheDocument());

        expect(screen.getByRole('button', { name: /收合/ })).toBeInTheDocument();
    });

    it('收合狀態下 hook 仍照常完成資料載入：展開當下立即看到資料，不再重新 loading', async () => {
        render(<EisenhowerMatrix collapsible defaultCollapsed />);

        // 等待收合狀態下的初始載入完成（loading skeleton 消失、標題出現）
        await waitFor(() => expect(screen.getByText('輕重緩急看板')).toBeInTheDocument());
        expect(mockGetMatrix).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /展開/ }));

        // 展開後立即可見資料（不需要等待新的一輪 loading skeleton）
        expect(screen.getByText('王小明')).toBeInTheDocument();
        expect(mockGetMatrix).toHaveBeenCalledTimes(1);
    });

    it('點擊標題列本身（而非只有按鈕）即可展開/收合', async () => {
        render(<EisenhowerMatrix collapsible defaultCollapsed />);
        await waitFor(() => expect(screen.getByText('輕重緩急看板')).toBeInTheDocument());
        expect(screen.queryByText('王小明')).not.toBeInTheDocument();

        // 點擊標題文字（非收合按鈕本身）也能展開
        fireEvent.click(screen.getByText('輕重緩急看板'));
        await waitFor(() => expect(screen.getByText('王小明')).toBeInTheDocument());

        // 再點一次標題列收合回去
        fireEvent.click(screen.getByText('輕重緩急看板'));
        expect(screen.queryByText('王小明')).not.toBeInTheDocument();
    });

    it('展開狀態下點擊「＋新增象限」不應觸發標題列的收合', async () => {
        render(<EisenhowerMatrix collapsible />);
        await waitFor(() => expect(screen.getByText(/待分類/)).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /新增象限/ }));

        // 矩陣本體仍可見（沒有被誤觸收合）
        expect(screen.getByText(/待分類/)).toBeInTheDocument();
    });

    it('收合時標題左右兩側都有原地輕搖的貓咪（左 1 隻、右 2 隻）；展開後全部消失', async () => {
        render(<EisenhowerMatrix collapsible defaultCollapsed />);
        await waitFor(() => expect(screen.getByText('輕重緩急看板')).toBeInTheDocument());

        expect(screen.getAllByTestId('idle-mascot')).toHaveLength(3);

        fireEvent.click(screen.getByText('輕重緩急看板'));
        await waitFor(() => expect(screen.getByText('王小明')).toBeInTheDocument());
        expect(screen.queryAllByTestId('idle-mascot')).toHaveLength(0);
    });

    it('collapsible=false（首頁用法）時不出現小吉祥物', async () => {
        render(<EisenhowerMatrix />);
        await waitFor(() => expect(screen.getByText(/待分類/)).toBeInTheDocument());

        expect(screen.queryByTestId('idle-mascot')).not.toBeInTheDocument();
    });
});
