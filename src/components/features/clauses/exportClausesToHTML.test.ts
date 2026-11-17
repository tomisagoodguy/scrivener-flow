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
        // 側欄改列段落（不再列標籤），含單引號的標籤改由卡片 data-tags 屬性驗證跳脫
        expect(card?.getAttribute('data-tags')).toBe("it's");
    });

    describe('主題版面（Offline HTML export mirrors the full view）', () => {
        const topicClauses: Clause[] = [
            { id: 'p', category: '增補特約', title: '車位－使用權車位', content: '車位條文', tags: [], usage_count: 0, topic: '車位', note: '先確認分管協議' },
            { id: 'n', category: '增補特約', title: '無主題條文', content: '無主題內容', tags: [], usage_count: 0, topic: null, note: null },
            { id: 'b', category: '基本特約', title: '立約日－以用印日為立約日', content: '立約日條文', tags: [], usage_count: 0, topic: '稅費', note: null },
        ];
        const renderTopics = (): Document => {
            exportClausesToHTML(topicClauses);
            return new DOMParser().parseFromString(captured, 'text/html');
        };

        it('Export section order：基本特約、車位、未分類，側欄同順序並附條數', () => {
            const doc = renderTopics();
            const sections = Array.from(doc.querySelectorAll('section')).map((s) => s.getAttribute('data-section'));
            expect(sections).toEqual(['基本特約', '車位', '未分類']);
            const links = Array.from(doc.querySelectorAll('.section-link'));
            expect(links.map((l) => l.getAttribute('data-section'))).toEqual(['基本特約', '車位', '未分類']);
            expect(links.map((l) => l.querySelector('.badge')?.textContent)).toEqual(['1', '1', '1']);
            expect(doc.querySelector('section[data-section="稅費"]')).toBeNull();
        });

        it('Export note is shown and searchable：卡片顯示備註且可被搜尋', () => {
            const doc = renderTopics();
            const card = Array.from(doc.querySelectorAll('.clause'))
                .find((el) => el.querySelector('.clause-title')?.textContent === '車位－使用權車位');
            expect(card?.querySelector('.clause-note')?.textContent).toContain('先確認分管協議');
            expect(card?.getAttribute('data-search')).toContain('先確認分管協議');
        });

        it('Export copy stays exact：跨段落 id 不重複，各卡片複製原文為自身條文', () => {
            const doc = renderTopics();
            const ids = Array.from(doc.querySelectorAll('[id]')).map((el) => el.id);
            expect(new Set(ids).size).toBe(ids.length);
            Array.from(doc.querySelectorAll('.clause')).forEach((card) => {
                const title = card.querySelector('.clause-title')?.textContent;
                const raw = card.querySelector('textarea.raw-text') as HTMLTextAreaElement | null;
                expect(raw?.value).toBe(topicClauses.find((c) => c.title === title)?.content);
            });
        });
    });
});
