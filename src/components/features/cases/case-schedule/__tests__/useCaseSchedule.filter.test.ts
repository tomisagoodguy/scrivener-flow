import { renderHook, waitFor, act } from '@testing-library/react';
import { useCaseSchedule } from '../useCaseSchedule';

// 今天下午 3 點（測試固定「現在」時間，讓「今天早於現在」的行程有可判斷的基準）
const NOW = new Date(2026, 6, 21, 15, 0, 0);
// 同一天早上 9 點的行程 due_date（早於 NOW，但仍是「今天」）
const TODAY_MORNING_ITEM = {
    id: 'item-1',
    case_id: 'case-1',
    content: '早上跟代書碰面',
    due_date: new Date(2026, 6, 21, 9, 0, 0).toISOString(),
    source_type: 'manual',
    is_completed: false,
};

function createQueryBuilder() {
    const builder: Record<string, unknown> = {
        select: jest.fn(),
        eq: jest.fn(),
        gte: jest.fn(),
        order: jest.fn(),
        then: (resolve: (value: { data: typeof TODAY_MORNING_ITEM[]; error: null }) => unknown) =>
            resolve({ data: [TODAY_MORNING_ITEM], error: null }),
    };
    (builder.select as jest.Mock).mockReturnValue(builder);
    (builder.eq as jest.Mock).mockReturnValue(builder);
    (builder.gte as jest.Mock).mockReturnValue(builder);
    (builder.order as jest.Mock).mockReturnValue(builder);
    return builder;
}

jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ from: () => createQueryBuilder() }),
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/app/actions/calendarSync', () => ({
    syncTodoToCalendar: jest.fn().mockResolvedValue({ success: true }),
}));

describe('useCaseSchedule - 未來(future)篩選', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('今天已過的時段行程仍應顯示在「未來」分頁，不會新增後就消失', async () => {
        const { result } = renderHook(() => useCaseSchedule('case-1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        // 預設 filter 即為 'future'
        expect(result.current.filter).toBe('future');
        expect(result.current.filteredItems.map((i) => i.id)).toContain('item-1');
    });
});
