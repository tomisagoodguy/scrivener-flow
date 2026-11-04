/**
 * 遞牌費歷史與名單管理（spec: Handover fee history with filters、Scrivener roster management）
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FeeHistory } from '../FeeHistory';
import type { HandoverFeeWithNames, LedgerEntry, Scrivener, SoloHandoverFee } from '@/domain/handover-fee/types';
import { HandoverFeeEditProvider } from '../HandoverFeeEditContext';

const renderWithEdit = (ui: React.ReactElement) => render(ui, { wrapper: HandoverFeeEditProvider });

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mockReplace }),
}));

const mockSetPaid = jest.fn();
const mockDelete = jest.fn();
const mockArchive = jest.fn();
jest.mock('@/app/actions/handoverFees', () => ({
    setHandoverFeePaid: (...args: unknown[]) => mockSetPaid(...args),
    deleteHandoverFee: (...args: unknown[]) => mockDelete(...args),
    archiveScrivener: (...args: unknown[]) => mockArchive(...args),
}));

const A = '11111111-1111-4111-8111-111111111111';
const H = '77777777-7777-4777-8777-777777777777';
const scriveners: Scrivener[] = [
    { id: A, name: '孔協', sort_order: 0, archived_at: null },
    { id: H, name: '來慶', sort_order: 5, archived_at: '2026-10-01T00:00:00Z' },
];
const solo = (id: string, case_count: number, amount: number | null): SoloHandoverFee => ({
    id,
    entry_type: 'solo',
    fee_date: '2026-10-20',
    object_number: null,
    case_count,
    amount,
    note: null,
});
const fees: HandoverFeeWithNames[] = [
    {
        id: 'f1',
        entry_type: 'exchange',
        fee_date: '2026-10-12',
        object_number: 'B456',
        payer_scrivener_id: A,
        payee_scrivener_id: H,
        amount: 2000,
        paid_at: '2026-10-12T08:00:00Z',
        note: null,
        payer_name: '孔協',
        payee_name: '來慶',
    },
];

beforeEach(() => {
    jest.clearAllMocks();
    mockSetPaid.mockResolvedValue({ success: true });
    mockArchive.mockResolvedValue({ success: true });
});

describe('FeeHistory', () => {
    it('已隱藏的來慶仍顯示在紀錄中，但不在篩選選項', () => {
        renderWithEdit(<FeeHistory fees={fees} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        expect(screen.getByRole('listitem')).toHaveTextContent('孔協 → 來慶');
        const filter = screen.getByLabelText('地政士篩選');
        expect(within(filter).queryByRole('option', { name: '來慶' })).toBeNull();
        expect(within(filter).getByRole('option', { name: '孔協' })).toBeInTheDocument();
    });

    it('URL 篩選指向已隱藏者時，選單顯示「（已隱藏）」選項並選中', () => {
        renderWithEdit(<FeeHistory fees={fees} scriveners={scriveners} month="2026-10" scrivenerId={H} />);
        const filter = screen.getByLabelText('地政士篩選') as HTMLSelectElement;
        expect(filter.value).toBe(H);
        expect(within(filter).getByRole('option', { name: '來慶（已隱藏）' })).toBeInTheDocument();
    });

    it('已收紀錄可改回未收', async () => {
        renderWithEdit(<FeeHistory fees={fees} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        expect(screen.getByRole('listitem')).toHaveTextContent('已收');
        fireEvent.click(screen.getByRole('button', { name: '改回未收' }));
        await waitFor(() => expect(mockSetPaid).toHaveBeenCalledWith('f1', false));
    });

    it('變更月份與地政士寫入 URL 參數', () => {
        renderWithEdit(<FeeHistory fees={fees} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        fireEvent.change(screen.getByLabelText('月份'), { target: { value: '2026-09' } });
        expect(mockReplace).toHaveBeenLastCalledWith('/cases?status=HandoverFee&month=2026-09');
        fireEvent.change(screen.getByLabelText('地政士篩選'), { target: { value: A } });
        expect(mockReplace).toHaveBeenLastCalledWith(`/cases?status=HandoverFee&month=2026-10&scrivener=${A}`);
    });

    it('鍵盤逐字輸入年份的中間值（0002-10 等）不觸發跳頁', () => {
        renderWithEdit(<FeeHistory fees={fees} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        for (const partial of ['0002-10', '0020-10', '0202-10']) {
            fireEvent.change(screen.getByLabelText('月份'), { target: { value: partial } });
        }
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('名單管理可隱藏使用中的地政士', async () => {
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderWithEdit(<FeeHistory fees={fees} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        fireEvent.click(screen.getByRole('button', { name: '隱藏 孔協' }));
        await waitFor(() => expect(mockArchive).toHaveBeenCalledWith(A));
        expect(screen.queryByRole('button', { name: '隱藏 來慶' })).toBeNull();
    });

    it('該月沒有紀錄時顯示空狀態', () => {
        renderWithEdit(<FeeHistory fees={[]} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        expect(screen.getByText('這個月沒有紀錄')).toBeInTheDocument();
        expect(screen.queryByTestId('history-summary')).toBeNull();
    });

    it('自己遞牌列顯示件數與 —，沒有已收狀態與標記已收', () => {
        renderWithEdit(<FeeHistory fees={[solo('s1', 3, null)]} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        const row = screen.getByRole('listitem');
        expect(row).toHaveTextContent('自己遞牌');
        expect(row).toHaveTextContent('3 件');
        expect(row).toHaveTextContent('—');
        expect(row).not.toHaveTextContent('未收');
        expect(row).not.toHaveTextContent('已收');
        expect(screen.queryByRole('button', { name: '標記已收' })).toBeNull();
        expect(screen.getByRole('button', { name: '編輯' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '刪除' })).toBeInTheDocument();
    });

    it('自己遞牌可刪除', async () => {
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        mockDelete.mockResolvedValue({ success: true });
        renderWithEdit(<FeeHistory fees={[solo('s1', 3, 9000)]} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        fireEvent.click(screen.getByRole('button', { name: '刪除' }));
        await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('s1'));
    });

    it('統計列分開顯示自己遞牌與互遞，不相加', () => {
        const mixed: LedgerEntry[] = [solo('s1', 3, 9000), solo('s2', 1, null), ...fees, { ...fees[0], id: 'f2', amount: 3000 }];
        renderWithEdit(<FeeHistory fees={mixed} scriveners={scriveners} month="2026-10" scrivenerId="" />);
        const summary = screen.getByTestId('history-summary');
        expect(summary).toHaveTextContent('自己遞牌 4 件 · $9,000');
        expect(summary).toHaveTextContent('互遞 2 筆 · $5,000');
    });

    it('統計列省略沒有紀錄的類型', () => {
        renderWithEdit(<FeeHistory fees={fees} scriveners={scriveners} month="2026-10" scrivenerId={A} />);
        const summary = screen.getByTestId('history-summary');
        expect(summary).toHaveTextContent('互遞 1 筆 · $2,000');
        expect(summary).not.toHaveTextContent('自己遞牌');
    });
});
