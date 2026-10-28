import { buildPoolChartRows } from '../poolChartUtils';
import type { Holding } from '@/types/investment';

function h(stock_code: string, stock_name: string | null = `名${stock_code}`): Holding {
    return { stock_code, stock_name } as Holding;
}

const ORDER = ['00981A', '00980A', '00991A'] as const;

describe('buildPoolChartRows', () => {
    it('合併三支 ETF、排除非 4 碼代號、依持有 ETF 數排序', () => {
        const rows = buildPoolChartRows(
            {
                '00981A': [h('2330'), h('2454'), h('NVDA')],
                '00980A': [h('2330'), h('3008')],
                '00991A': [h('2454'), h('2330'), h('006208')],
            },
            ORDER,
        );
        expect(rows).toEqual([
            { code: '2330', name: '名2330', etfs: ['00981A', '00980A', '00991A'] },
            { code: '2454', name: '名2454', etfs: ['00981A', '00991A'] },
            { code: '3008', name: '名3008', etfs: ['00980A'] },
        ]);
    });

    it('持有數相同時依代號遞增', () => {
        const rows = buildPoolChartRows(
            { '00981A': [h('3008'), h('2317')], '00980A': [h('2317'), h('3008')] },
            ORDER,
        );
        expect(rows.map((r) => [r.code, r.etfs])).toEqual([
            ['2317', ['00981A', '00980A']],
            ['3008', ['00981A', '00980A']],
        ]);
    });

    it('全部 ETF 無持股回傳空陣列', () => {
        expect(buildPoolChartRows({ '00981A': [], '00980A': [] }, ORDER)).toEqual([]);
    });

    it('stock_name 為 null 或空字串時名稱為空字串', () => {
        const rows = buildPoolChartRows({ '00981A': [h('2330', null), h('2454', '')] }, ORDER);
        expect(rows.map((r) => r.name)).toEqual(['', '']);
    });

    it('etfOrder 未列出的 ETF 不計入', () => {
        const rows = buildPoolChartRows({ '00981A': [h('2330')], 'XXXXX': [h('2330')] }, ORDER);
        expect(rows).toEqual([{ code: '2330', name: '名2330', etfs: ['00981A'] }]);
    });
});
