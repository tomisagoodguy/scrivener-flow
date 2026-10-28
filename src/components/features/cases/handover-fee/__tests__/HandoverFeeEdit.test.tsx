/**
 * 編輯遞牌費（spec: Edit a handover fee record）
 * 清單「編輯」→ 上方表單載入資料 → 儲存呼叫 updateHandoverFee / 取消回到新增模式
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HandoverFeeEditProvider } from '../HandoverFeeEditContext';
import { HandoverFeeForm } from '../HandoverFeeForm';
import { UnpaidFeeList } from '../UnpaidFeeList';
import type { HandoverFeeWithNames, Scrivener } from '@/domain/handover-fee/types';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/app/actions/handoverFees', () => ({
    createHandoverFee: (...args: unknown[]) => mockCreate(...args),
    updateHandoverFee: (...args: unknown[]) => mockUpdate(...args),
    addScrivener: jest.fn(),
    setHandoverFeePaid: jest.fn(),
    deleteHandoverFee: jest.fn(),
}));

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const H = '77777777-7777-4777-8777-777777777777';
const scriveners: Scrivener[] = [
    { id: A, name: '孔協', sort_order: 0, archived_at: null },
    { id: B, name: '家華', sort_order: 1, archived_at: null },
];
const unpaid: HandoverFeeWithNames = {
    id: 'f1',
    fee_date: '2026-10-27',
    object_number: 'A123',
    payer_scrivener_id: A,
    payee_scrivener_id: B,
    amount: 3000,
    paid_at: null,
    note: null,
    payer_name: '孔協',
    payee_name: '家華',
};

function renderLedger(fees: HandoverFeeWithNames[] = [unpaid]) {
    return render(
        <HandoverFeeEditProvider>
            <HandoverFeeForm scriveners={scriveners} defaultDate="2026-10-28" />
            <UnpaidFeeList fees={fees} today="2026-10-28" />
        </HandoverFeeEditProvider>
    );
}

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ success: true });
});

describe('編輯遞牌費', () => {
    it('按「編輯」把該筆資料載入表單並切到編輯模式', () => {
        renderLedger();
        fireEvent.click(screen.getByRole('button', { name: '編輯' }));

        expect(value('日期')).toBe('2026-10-27');
        expect(value('物件編號')).toBe('A123');
        expect(value('付款人')).toBe(A);
        expect(value('收款人')).toBe(B);
        expect(value('金額')).toBe('3000');
        expect(screen.getByRole('button', { name: '儲存修改' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '新增紀錄' })).toBeNull();
    });

    it('改金額 3500、物件 A124 後儲存 → 呼叫 updateHandoverFee，不新增', async () => {
        renderLedger();
        fireEvent.click(screen.getByRole('button', { name: '編輯' }));
        fireEvent.change(screen.getByLabelText('金額'), { target: { value: '3500' } });
        fireEvent.change(screen.getByLabelText('物件編號'), { target: { value: 'A124' } });
        fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));

        await waitFor(() =>
            expect(mockUpdate).toHaveBeenCalledWith('f1', {
                fee_date: '2026-10-27',
                object_number: 'A124',
                payer_scrivener_id: A,
                payee_scrivener_id: B,
                amount: 3500,
                note: '',
            })
        );
        expect(mockCreate).not.toHaveBeenCalled();
        // 儲存成功後回到新增模式
        expect(await screen.findByRole('button', { name: '新增紀錄' })).toBeInTheDocument();
        expect(value('金額')).toBe('');
    });

    it('取消編輯 → 欄位清空、回到新增模式、不呼叫任何寫入', () => {
        renderLedger();
        fireEvent.click(screen.getByRole('button', { name: '編輯' }));
        fireEvent.click(screen.getByRole('button', { name: '取消編輯' }));

        expect(screen.getByRole('button', { name: '新增紀錄' })).toBeInTheDocument();
        expect(value('物件編號')).toBe('');
        expect(value('日期')).toBe('2026-10-28');
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('驗證失敗（付款人 = 收款人）不送出並顯示錯誤', async () => {
        renderLedger();
        fireEvent.click(screen.getByRole('button', { name: '編輯' }));
        fireEvent.change(screen.getByLabelText('收款人'), { target: { value: A } });
        fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('付款人與收款人不可相同');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('伺服器回「找不到紀錄」時停留在編輯模式並顯示錯誤', async () => {
        mockUpdate.mockResolvedValue({ success: false, error: '找不到紀錄，請重新整理' });
        renderLedger();
        fireEvent.click(screen.getByRole('button', { name: '編輯' }));
        fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('找不到紀錄，請重新整理');
        expect(screen.getByRole('button', { name: '儲存修改' })).toBeInTheDocument();
    });

    it('付款人已隱藏時，編輯表單顯示為未選', () => {
        renderLedger([{ ...unpaid, payer_scrivener_id: H, payer_name: '來慶' }]);
        fireEvent.click(screen.getByRole('button', { name: '編輯' }));
        expect(value('付款人')).toBe('');
        expect(value('收款人')).toBe(B);
    });
});
