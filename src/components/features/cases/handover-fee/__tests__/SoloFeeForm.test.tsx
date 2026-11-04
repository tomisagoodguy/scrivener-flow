/**
 * 自己遞牌表單（spec: Record a solo handover entry、Edit a solo handover entry）
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HandoverFeeEditProvider, useHandoverFeeEdit } from '../HandoverFeeEditContext';
import { HandoverFeeForm } from '../HandoverFeeForm';
import type { HandoverFeeWithNames, LedgerEntry, Scrivener, SoloHandoverFee } from '@/domain/handover-fee/types';

const mockCreateSolo = jest.fn();
const mockUpdateSolo = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/app/actions/handoverFees', () => ({
    createHandoverFee: jest.fn(),
    updateHandoverFee: (...args: unknown[]) => mockUpdate(...args),
    createSoloFee: (...args: unknown[]) => mockCreateSolo(...args),
    updateSoloFee: (...args: unknown[]) => mockUpdateSolo(...args),
    addScrivener: jest.fn(),
}));

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const scriveners: Scrivener[] = [
    { id: A, name: '孔協', sort_order: 0, archived_at: null },
    { id: B, name: '家華', sort_order: 1, archived_at: null },
];
const soloEntry: SoloHandoverFee = {
    id: 's1',
    entry_type: 'solo',
    fee_date: '2026-11-04',
    object_number: null,
    case_count: 3,
    amount: null,
    note: null,
};
const exchangeEntry: HandoverFeeWithNames = {
    id: 'f1',
    entry_type: 'exchange',
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

function EditButton({ entry }: { entry: LedgerEntry }) {
    const { startEdit } = useHandoverFeeEdit();
    return <button type="button" onClick={() => startEdit(entry)}>開始編輯</button>;
}

function renderForm(list: Scrivener[] = scriveners, entry: LedgerEntry = soloEntry) {
    return render(
        <HandoverFeeEditProvider>
            <HandoverFeeForm scriveners={list} defaultDate="2026-11-04" />
            <EditButton entry={entry} />
        </HandoverFeeEditProvider>
    );
}

const switchToSolo = () => fireEvent.click(screen.getByRole('button', { name: '自己遞牌' }));
const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
const setValue = (label: string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });

beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSolo.mockResolvedValue({ success: true });
    mockUpdateSolo.mockResolvedValue({ success: true });
});

describe('新增自己遞牌', () => {
    it('預設為互遞；切換後顯示件數（預設 1），不顯示付款人與收款人', () => {
        renderForm();
        expect(screen.getByLabelText('付款人')).toBeInTheDocument();
        switchToSolo();
        expect(value('件數')).toBe('1');
        expect(value('日期')).toBe('2026-11-04');
        expect(screen.queryByLabelText('付款人')).toBeNull();
        expect(screen.queryByLabelText('收款人')).toBeNull();
    });

    it('只填件數 3、金額空白 → 送出 amount: null', async () => {
        renderForm();
        switchToSolo();
        setValue('件數', '3');
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));

        await waitFor(() =>
            expect(mockCreateSolo).toHaveBeenCalledWith({
                fee_date: '2026-11-04',
                object_number: '',
                case_count: 3,
                amount: null,
                note: '',
            })
        );
    });

    it('件數 2、金額 6000 → 送出金額；成功後欄位清空、件數回到 1', async () => {
        renderForm();
        switchToSolo();
        setValue('件數', '2');
        setValue('金額（選填）', '6000');
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));

        await waitFor(() =>
            expect(mockCreateSolo).toHaveBeenCalledWith(expect.objectContaining({ case_count: 2, amount: 6000 }))
        );
        await waitFor(() => expect(value('件數')).toBe('1'));
        expect(value('金額（選填）')).toBe('');
    });

    it('名單為空仍可送出，且不顯示名單提示', async () => {
        renderForm([]);
        switchToSolo();
        expect(screen.queryByText('名單是空的，請先新增地政士')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));
        await waitFor(() => expect(mockCreateSolo).toHaveBeenCalledTimes(1));
    });

    it.each([
        ['0', '件數必須是正整數'],
        ['', '件數必須是正整數'],
    ])('件數「%s」不送出並顯示錯誤', async (count, message) => {
        renderForm();
        switchToSolo();
        setValue('件數', count);
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(mockCreateSolo).not.toHaveBeenCalled();
    });

    it('伺服器失敗時顯示錯誤且保留輸入', async () => {
        mockCreateSolo.mockResolvedValue({ success: false, error: 'db boom' });
        renderForm();
        switchToSolo();
        setValue('件數', '5');
        fireEvent.click(screen.getByRole('button', { name: '新增紀錄' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('db boom');
        expect(value('件數')).toBe('5');
    });
});

describe('編輯自己遞牌', () => {
    it('改件數 4、金額 12000 → 呼叫 updateSoloFee，不新增，回到新增模式', async () => {
        renderForm();
        fireEvent.click(screen.getByRole('button', { name: '開始編輯' }));
        expect(value('件數')).toBe('3');
        expect(value('金額（選填）')).toBe('');
        setValue('件數', '4');
        setValue('金額（選填）', '12000');
        fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));

        await waitFor(() =>
            expect(mockUpdateSolo).toHaveBeenCalledWith('s1', {
                fee_date: '2026-11-04',
                object_number: '',
                case_count: 4,
                amount: 12000,
                note: '',
            })
        );
        expect(mockCreateSolo).not.toHaveBeenCalled();
        expect(await screen.findByRole('button', { name: '新增紀錄' })).toBeInTheDocument();
    });

    it('取消編輯 → 不寫入、回到新增模式', () => {
        renderForm();
        fireEvent.click(screen.getByRole('button', { name: '開始編輯' }));
        fireEvent.click(screen.getByRole('button', { name: '取消編輯' }));
        expect(screen.getByRole('button', { name: '新增紀錄' })).toBeInTheDocument();
        expect(mockUpdateSolo).not.toHaveBeenCalled();
    });

    it.each([
        ['自己遞牌', soloEntry, '件數'],
        ['互遞', exchangeEntry, '付款人'],
    ])('編輯%s時顯示該類型欄位，且沒有類型切換', (_label, entry, field) => {
        renderForm(scriveners, entry);
        fireEvent.click(screen.getByRole('button', { name: '開始編輯' }));
        expect(screen.getByLabelText(field)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '自己遞牌' })).toBeNull();
        expect(screen.queryByRole('button', { name: '互遞' })).toBeNull();
    });
});
