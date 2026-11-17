import { exportClausesToHTML } from './exportClausesToHTML';
import type { Clause } from './useClauses';

describe('exportClausesToHTML', () => {
    let captured = '';
    const OriginalBlob = global.Blob;

    beforeEach(() => {
        captured = '';
        global.Blob = class {
            constructor(parts: string[]) { captured = parts.join(''); }
        } as unknown as typeof Blob;
        URL.createObjectURL = jest.fn(() => 'blob:x');
        URL.revokeObjectURL = jest.fn();
        jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    });

    afterEach(() => {
        global.Blob = OriginalBlob;
        jest.restoreAllMocks();
    });

    const clauses: Clause[] = [
        { id: '1', category: '基本特約', title: '基本A', content: '基本條文一', tags: ['t1'], usage_count: 0, topic: null, note: null },
        { id: '2', category: '基本特約', title: '基本B "引號"', content: '含 <b> & "雙引號" 的條文', tags: ["it's"], usage_count: 0, topic: null, note: null },
        { id: '3', category: '增補特約', title: '增補A', content: '增補條文一\n第二行', tags: ['t1'], usage_count: 0, topic: null, note: null },
    ];

    const render = (): Document => {
        exportClausesToHTML(clauses);
        return new DOMParser().parseFromString(captured, 'text/html');
    };

    it('跨分類的元素 id 不重複（基本特約與增補特約不可撞號）', () => {
        const ids = Array.from(render().querySelectorAll('[id]')).map((el) => el.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('每個複製按鈕對應的原文就是該卡片自己的條文', () => {
        const doc = render();
        const cards = Array.from(doc.querySelectorAll('.clause'));
        expect(cards).toHaveLength(clauses.length);
        cards.forEach((card) => {
            const btn = card.querySelector('.copy-btn');
            const idx = btn?.getAttribute('onclick')?.match(/copyClause\(event,(\d+)\)/)?.[1];
            const raw = doc.getElementById(`raw${idx}`) as HTMLTextAreaElement | null;
            const title = card.querySelector('.clause-title')?.textContent;
            const expected = clauses.find((c) => c.title === title)?.content;
            expect(raw?.closest('.clause')).toBe(card);
            expect(raw?.value).toBe(expected);
        });
    });

    it('特殊字元會跳脫，不破壞屬性與標記', () => {
        const doc = render();
        const card = Array.from(doc.querySelectorAll('.clause'))
            .find((el) => el.querySelector('.clause-title')?.textContent === '基本B "引號"');
        expect(card?.getAttribute('data-search')).toContain('"雙引號"');
        expect(card?.querySelector('.clause-content b')).toBeNull();
        expect(doc.querySelector('.tag-link[data-tag="it\'s"]')).not.toBeNull();
    });
});
