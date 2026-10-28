/**
 * 遞牌費新增表單（spec: Record a handover fee、Scrivener roster management）
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HandoverFeeForm } from '../HandoverFeeForm';
import type { Scrivener } from '@/domain/handover-fee/types';

const mockCreate = jest.fn();
const mockAddScrivener = jest.fn();
jest.mock('@/app/actions/handoverFees', () => ({
    createHandoverFee: (...args: unknown[]) => mockCreate(...args),
    addScrivener: (...args: unknown[]) => mockAddScrivener(...args),
}));

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const scriveners: Scrivener[] = [
    { id: A, name: '孔協', sort_order: 0, archived_at: null },
    { id: B, name: '家華', sort_order: 1, archived_at: null },
];

function fillValid() {
    fireEvent.change(screen.getByLabelText('物件編號'), { target: { value: 'A123' } });
    fireEvent.change(screen.getByLabelText('付款人'), { target: { value: A } });
    fireEvent.change(screen.getByLabelText('收款人'), { target: { value: B } });
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '3000' } });
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date('2026-10-28T02:00:00Z') });
});
afterEach(() => jest.useRealTimers());

describe('HandoverFeeForm', () => {
    it('日期預設為台北今天且可修改', () => {
        render(<HandoverFeeForm scriveners={scriveners} />);
        const date = screen.getByLabelText('日期') as HTMLInputElement;
        expect(date.value).toBe('2026-10-28');
        fireEvent.change(date, { target: { value: '2026-10-25' } });
        expect(date.value).toBe('2026-10-25');
    });

    it('⇄ 對調付款人與收款人', () => {
        render(<HandoverFeeForm scriveners={scriveners} />);
        fillValid();
        fireEvent.click(screen.getByRole('button', { name: '對調付款人與收款人' }));
        expect((screen.getByLabelText('付款人') as HTMLSelectElement).value).toBe(B);
        expect((screen.getByLabelText('收款人') as HTMLSelectElement).value).toBe(A);
    });

    it('送出有效資料呼叫 createHandoverFee（含修改後的日期）', async () => {
        mockCreate.mockResolvedValue({ success: true });
        render(<HandoverFeeForm scriveners={scriveners} />);
        fillValid();
        fireEvent.change(screen.getByLabelText('日期'), { target: { value: '2026-10-25' } });
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));

        await waitFor(() =>
            expect(mockCreate).toHaveBeenCalledWith({
                fee_date: '2026-10-25',
                object_number: 'A123',
                payer_scrivener_id: A,
                payee_scrivener_id: B,
                amount: 3000,
                note: '',
            })
        );
    });

    it('付款人與收款人相同時顯示錯誤且不送出', async () => {
        render(<HandoverFeeForm scriveners={scriveners} />);
        fillValid();
        fireEvent.change(screen.getByLabelText('收款人'), { target: { value: A } });
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('付款人與收款人不可相同');
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('伺服器回傳錯誤時顯示訊息', async () => {
        mockCreate.mockResolvedValue({ success: false, error: 'violates foreign key constraint' });
        render(<HandoverFeeForm scriveners={scriveners} />);
        fillValid();
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('violates foreign key constraint');
    });

    it('選單中「＋新增地政士」可就地新增', async () => {
        mockAddScrivener.mockResolvedValue({ success: true });
        render(<HandoverFeeForm scriveners={scriveners} />);
        fireEvent.change(screen.getByLabelText('付款人'), { target: { value: '__add__' } });
        fireEvent.change(screen.getByLabelText('新地政士姓名'), { target: { value: '志明' } });
        fireEvent.click(screen.getByRole('button', { name: '加入名單' }));
        await waitFor(() => expect(mockAddScrivener).toHaveBeenCalledWith('志明'));
    });

    it('已選的地政士被隱藏後，選取清空且無法送出', async () => {
        const { rerender } = render(<HandoverFeeForm scriveners={scriveners} />);
        fillValid();
        rerender(<HandoverFeeForm scriveners={[scriveners[1]]} />);

        expect((screen.getByLabelText('付款人') as HTMLSelectElement).value).toBe('');
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('請選擇付款人');
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('名單為空時提示新增地政士', () => {
        render(<HandoverFeeForm scriveners={[]} />);
        expect(screen.getByText('名單是空的，請先新增地政士')).toBeInTheDocument();
    });
});
