import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HiddenWidgetsMenu } from '../HiddenWidgetsMenu';

describe('HiddenWidgetsMenu', () => {
    it('清單為空時不渲染按鈕', () => {
        render(<HiddenWidgetsMenu hiddenWidgetIds={[]} onShow={jest.fn()} />);
        expect(screen.queryByRole('button', { name: /已隱藏區塊/ })).not.toBeInTheDocument();
    });

    it('有隱藏項目時渲染按鈕，點擊展開清單', () => {
        render(
            <HiddenWidgetsMenu
                hiddenWidgetIds={['pipeline-view', 'todo-container']}
                onShow={jest.fn()}
            />
        );

        const toggleButton = screen.getByRole('button', { name: /已隱藏區塊/ });
        expect(toggleButton).toBeInTheDocument();

        fireEvent.click(toggleButton);
        expect(screen.getByRole('menuitem', { name: /案件進度總覽/ })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /待辦事項/ })).toBeInTheDocument();
    });

    it('點擊清單項目觸發 onShow 回呼，且父層更新後該項從清單移除', () => {
        const onShow = jest.fn();
        const { rerender } = render(
            <HiddenWidgetsMenu hiddenWidgetIds={['pipeline-view', 'todo-container']} onShow={onShow} />
        );

        fireEvent.click(screen.getByRole('button', { name: /已隱藏區塊/ }));
        fireEvent.click(screen.getByRole('menuitem', { name: /案件進度總覽/ }));
        expect(onShow).toHaveBeenCalledWith('pipeline-view');

        // 父層依 onShow 更新 hiddenWidgetIds（移除 pipeline-view）
        rerender(<HiddenWidgetsMenu hiddenWidgetIds={['todo-container']} onShow={onShow} />);
        fireEvent.click(screen.getByRole('button', { name: /已隱藏區塊/ }));
        expect(screen.queryByRole('menuitem', { name: /案件進度總覽/ })).not.toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /待辦事項/ })).toBeInTheDocument();
    });

    it('移除到剩下最後一項並由父層清空後，按鈕消失', () => {
        const { rerender } = render(
            <HiddenWidgetsMenu hiddenWidgetIds={['todo-container']} onShow={jest.fn()} />
        );
        expect(screen.getByRole('button', { name: /已隱藏區塊/ })).toBeInTheDocument();

        rerender(<HiddenWidgetsMenu hiddenWidgetIds={[]} onShow={jest.fn()} />);
        expect(screen.queryByRole('button', { name: /已隱藏區塊/ })).not.toBeInTheDocument();
    });
});
