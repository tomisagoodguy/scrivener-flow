import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PersonChip from '../PersonChip';
import EisenhowerMatrix from '../EisenhowerMatrix';
import { DEFAULT_ZONES } from '../types';

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

jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ from: () => createQueryBuilder() }),
}));

jest.mock('@/app/actions/eisenhowerActions', () => ({
    getEisenhowerMatrix: jest.fn().mockImplementation(() =>
        Promise.resolve({
            zones: [
                { id: 'q1', label: '重要且緊急' },
                { id: 'q2', label: '重要不緊急' },
                { id: 'q3', label: '緊急不重要' },
                { id: 'q4', label: '不重要不緊急' },
            ],
            placements: {},
        })
    ),
    saveEisenhowerMatrix: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/hooks/useNotification', () => ({
    useNotification: () => ({ error: jest.fn(), success: jest.fn() }),
}));

const baseChip = { key: 'A', caseId: 'A', caseNumber: 'C-A', buyerName: '王小明', sellerName: '陳大文' };

describe('PersonChip 選單互動', () => {
    it('勾選項目會呼叫 onToggleZone；選單開啟時停用拖曳', () => {
        const onToggleZone = jest.fn();
        const { container } = render(
            <PersonChip
                chip={baseChip}
                zones={DEFAULT_ZONES}
                currentZoneId={null}
                memberships={[]}
                menuOpen
                onOpenMenu={jest.fn()}
                onCloseMenu={jest.fn()}
                onToggleZone={onToggleZone}
                onClearZones={jest.fn()}
            />
        );

        // 選單開啟 → 名片本體不可拖曳（避免點擊被誤判為 drag start）
        expect(container.querySelector('[draggable="false"]')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /重要且緊急/ }));
        expect(onToggleZone).toHaveBeenCalledWith('A', 'q1');
    });
});

describe('EisenhowerMatrix 選單釘住（回歸：勾第一格後選單不可消失）', () => {
    it('從待分類勾選 q1 後，選單仍開啟且可續勾 q2', async () => {
        render(<EisenhowerMatrix />);
        await waitFor(() => expect(screen.getByText(/待分類/)).toBeInTheDocument());

        // 開啟待分類名片的選單
        fireEvent.click(screen.getByRole('button', { name: /選擇 王小明 的象限/ }));
        const menu = await screen.findByRole('menu');
        const q1Item = within(menu).getByRole('button', { name: /重要且緊急/ });

        // 勾 q1 → 名片獲得歸屬（原本會 unmount 導致選單消失）
        fireEvent.click(q1Item);

        // 回歸斷言：選單仍在，且可以續勾 q2（精確匹配，避免撞到 q4「不重要不緊急」）
        const menuAfter = screen.getByRole('menu');
        const q2Item = within(menuAfter).getByRole('button', { name: '重要不緊急' });
        fireEvent.click(q2Item);

        // 同卡此時應同時出現在 q1 與 q2（兩個格內實例 + 釘住的待分類實例）
        await waitFor(() => {
            expect(screen.getAllByText('王小明').length).toBeGreaterThanOrEqual(3);
        });
    });
});
