/**
 * ClauseItem（change: contract-clauses-topic-grouping，spec「Note shown on the clause card」）
 * 涵蓋：有備註才顯示、複製只傳條文內容不含備註。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { ClauseItem } from './ClauseItem';
import type { Clause } from './useClauses';

const base: Clause = {
    id: 'c1',
    title: '氯離子－同社區其他戶超標',
    content: '甲、乙雙方確認本建物同社區其他建物曾發現氯離子超標。',
    category: '增補特約',
    tags: [],
    usage_count: 0,
    topic: '屋況瑕疵',
    note: null,
};

const renderItem = (clause: Clause, onCopy = jest.fn()) => {
    render(<ClauseItem clause={clause} copyFeedback={null} onCopy={onCopy} onEdit={jest.fn()} onDelete={jest.fn()} />);
    return onCopy;
};

describe('ClauseItem', () => {
    it('有備註時顯示備註', () => {
        renderItem({ ...base, note: '氯離子和結構特約不可以壓在一起' });
        expect(screen.getByText(/氯離子和結構特約不可以壓在一起/)).toBeInTheDocument();
    });

    it('沒有備註時不顯示備註區塊', () => {
        renderItem(base);
        expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
    });

    it('Copy excludes the note：複製只傳條文內容', () => {
        const onCopy = renderItem({ ...base, note: '使用提醒' });
        fireEvent.click(screen.getByText(base.content));
        expect(onCopy).toHaveBeenCalledWith('甲、乙雙方確認本建物同社區其他建物曾發現氯離子超標。', 'c1');
    });
});
