/**
 * 未收款清單（spec: Unpaid fee list with aging highlight、Mark a fee as received、Delete a handover fee record）
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnpaidFeeList } from '../UnpaidFeeList';
import type { HandoverFeeWithNames } from '@/domain/handover-fee/types';

const mockSetPaid = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/app/actions/handoverFees', () => ({
    setHandoverFeePaid: (...args: unknown[]) => mockSetPaid(...args),
    deleteHandoverFee: (...args: unknown[]) => mockDelete(...args),
}));

function fee(id: string, fee_date: string, amount: number): HandoverFeeWithNames {
    return {
        id,
        fee_date,
        object_number: `OBJ-${id}`,
        payer_scrivener_id: 'p',
        payee_scrivener_id: 'q',
        amount,
        paid_at: null,
        note: null,
        payer_name: '孔協',
        payee_name: '家華',
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSetPaid.mockResolvedValue({ success: true });
    mockDelete.mockResolvedValue({ success: true });
});

describe('UnpaidFeeList', () => {
    it('顯示未收筆數與總額（3000 + 2000）', () => {
        render(<UnpaidFeeList fees={[fee('1', '2026-10-27', 3000), fee('2', '2026-10-28', 2000)]} today="2026-10-28" />);
        expect(screen.getByText('未收 2 筆，共 $5,000')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it.each([
        ['2026-10-28', 'none'],
        ['2026-10-25', 'none'],
        ['2026-10-24', 'orange'],
        ['2026-10-21', 'orange'],
        ['2026-10-20', 'red'],
    ])('帳齡著色：%s → %s', (date, level) => {
        render(<UnpaidFeeList fees={[fee('1', date, 1000)]} today="2026-10-28" />);
        expect(screen.getByRole('listitem')).toHaveAttribute('data-aging', level);
    });

    it.each([
        ['2026-10-30', '未到'],
        ['2026-10-28', '今天'],
        ['2026-10-24', '4 天'],
    ])('帳齡文字：%s → %s', (date, label) => {
        render(<UnpaidFeeList fees={[fee('1', date, 1000)]} today="2026-10-28" />);
        expect(screen.getByRole('listitem')).toHaveTextContent(label);
    });

    it('按「已收」呼叫 setHandoverFeePaid(id, true)', async () => {
        render(<UnpaidFeeList fees={[fee('1', '2026-10-28', 3000)]} today="2026-10-28" />);
        fireEvent.click(screen.getByRole('button', { name: '已收' }));
        await waitFor(() => expect(mockSetPaid).toHaveBeenCalledWith('1', true));
    });

    it('刪除取消確認時不呼叫刪除', () => {
        jest.spyOn(window, 'confirm').mockReturnValue(false);
        render(<UnpaidFeeList fees={[fee('1', '2026-10-28', 3000)]} today="2026-10-28" />);
        fireEvent.click(screen.getByRole('button', { name: '刪除' }));
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('刪除確認後呼叫 deleteHandoverFee', async () => {
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        render(<UnpaidFeeList fees={[fee('1', '2026-10-28', 3000)]} today="2026-10-28" />);
        fireEvent.click(screen.getByRole('button', { name: '刪除' }));
        await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('1'));
    });

    it('操作失敗時顯示錯誤', async () => {
        mockSetPaid.mockResolvedValue({ success: false, error: 'boom' });
        render(<UnpaidFeeList fees={[fee('1', '2026-10-28', 3000)]} today="2026-10-28" />);
        fireEvent.click(screen.getByRole('button', { name: '已收' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    });

    it('沒有未收款時顯示空狀態', () => {
        render(<UnpaidFeeList fees={[]} today="2026-10-28" />);
        expect(screen.getByText('目前沒有未收的遞牌費')).toBeInTheDocument();
    });
});
