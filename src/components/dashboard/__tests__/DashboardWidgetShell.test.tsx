import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

function renderShell(props: Partial<React.ComponentProps<typeof DashboardWidgetShell>> = {}) {
    const onHide = props.onHide ?? jest.fn();
    return render(
        <DndContext>
            <SortableContext items={['pipeline-view']} strategy={verticalListSortingStrategy}>
                <DashboardWidgetShell id="pipeline-view" onHide={onHide} {...props}>
                    <div>區塊內容</div>
                </DashboardWidgetShell>
            </SortableContext>
        </DndContext>
    );
}

describe('DashboardWidgetShell', () => {
    it('預設（interactive）狀態下渲染拖曳把手與 X 按鈕', () => {
        renderShell();
        expect(screen.getByRole('button', { name: '拖曳調整順序' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '隱藏此區塊' })).toBeInTheDocument();
        expect(screen.getByText('區塊內容')).toBeInTheDocument();
    });

    it('interactive=false 時（如 welcome-header）不渲染拖曳把手與 X 按鈕', () => {
        renderShell({ interactive: false });
        expect(screen.queryByRole('button', { name: '拖曳調整順序' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '隱藏此區塊' })).not.toBeInTheDocument();
        expect(screen.getByText('區塊內容')).toBeInTheDocument();
    });

    it('點擊 X 按鈕觸發 onHide 回呼', () => {
        const onHide = jest.fn();
        renderShell({ onHide });

        fireEvent.click(screen.getByRole('button', { name: '隱藏此區塊' }));
        expect(onHide).toHaveBeenCalledTimes(1);
    });
});
