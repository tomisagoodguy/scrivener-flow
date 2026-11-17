/**
 * ClauseEditModal（change: contract-clauses-topic-grouping，spec「Topic and note in the edit form」）
 * 涵蓋：主題下拉必填且為 12 主題、無主題舊資料開啟時未選、未選主題無法送出、主題與備註隨儲存送出、標籤仍可新增。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { ClauseEditModal } from './ClauseEditModal';
import type { Clause } from './useClauses';

const setup = (initial: Partial<Clause>) => {
    const onSave = jest.fn().mockResolvedValue(true);
    render(<ClauseEditModal initialClause={initial} onClose={jest.fn()} onSave={onSave} />);
    return onSave;
};

const topicSelect = () => screen.getByLabelText(/主題/) as HTMLSelectElement;

describe('ClauseEditModal 主題與備註', () => {
    it('主題下拉為必填，選項為 12 個主題', () => {
        setup({ category: '增補特約', tags: [] });
        const select = topicSelect();
        expect(select.required).toBe(true);
        const values = Array.from(select.options).map((o) => o.value).filter(Boolean);
        expect(values).toEqual([
            '價金付款', '貸款代償', '交屋騰空', '租賃', '車位', '屋況瑕疵',
            '增建違建', '土地產權', '稅費', '當事人特殊', '預售屋都更', '解約違約',
        ]);
    });

    it('無主題的既有條文開啟時沒有選取主題', () => {
        setup({ id: 'x', title: '舊條文', content: '內容', category: '增補特約', tags: [], topic: null });
        expect(topicSelect().value).toBe('');
    });

    it('Saving without a topic is blocked：未選主題按儲存不送出', () => {
        const onSave = setup({ category: '增補特約', tags: [] });
        fireEvent.change(screen.getByPlaceholderText('例如：現況交屋'), { target: { value: '新條文' } });
        fireEvent.change(screen.getByPlaceholderText('輸入完整的合約條文...'), { target: { value: '條文內容' } });
        fireEvent.click(screen.getByRole('button', { name: '儲存' }));
        expect(topicSelect().validity.valueMissing).toBe(true);
        expect(onSave).not.toHaveBeenCalled();
    });

    it('選主題、填備註與標籤後儲存，一併送出', () => {
        const onSave = setup({ category: '增補特約', tags: [] });
        fireEvent.change(screen.getByPlaceholderText('例如：現況交屋'), { target: { value: '車位－使用權車位' } });
        fireEvent.change(screen.getByPlaceholderText('輸入完整的合約條文...'), { target: { value: '條文內容' } });
        fireEvent.change(topicSelect(), { target: { value: '車位' } });
        fireEvent.change(screen.getByLabelText(/備註/), { target: { value: '先確認分管協議' } });
        fireEvent.change(screen.getByPlaceholderText('例如：現況、違約、交屋'), { target: { value: '使用權' } });
        fireEvent.click(screen.getByRole('button', { name: /新增/ }));
        fireEvent.click(screen.getByRole('button', { name: '儲存' }));
        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ topic: '車位', note: '先確認分管協議', tags: ['使用權'] }),
            true,
        );
    });
});
