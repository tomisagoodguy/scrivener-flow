import {
    CLAUSE_TOPICS,
    UNCATEGORIZED,
    filterClauses,
    groupClausesByTopic,
    isClauseTopic,
    normalizeClauseNote,
    parseTopicGroupKey,
} from './clauseTopics';

interface TestClause {
    id: string;
    title: string;
    category: string;
    topic: string | null | undefined;
}

const clause = (id: string, title: string, topic: string | null | undefined, category = '增補特約'): TestClause =>
    ({ id, title, topic, category });

describe('CLAUSE_TOPICS', () => {
    it('依規格順序列出 12 個主題', () => {
        expect([...CLAUSE_TOPICS]).toEqual([
            '價金付款', '貸款代償', '交屋騰空', '租賃', '車位', '屋況瑕疵',
            '增建違建', '土地產權', '稅費', '當事人特殊', '預售屋都更', '解約違約',
        ]);
    });
});

describe('isClauseTopic', () => {
    it.each([
        ['租賃', true],
        ['其他', false],
        [UNCATEGORIZED, false],
        [null, false],
        [undefined, false],
        [3, false],
    ])('%p → %p', (value, expected) => {
        expect(isClauseTopic(value)).toBe(expected);
    });
});

describe('groupClausesByTopic', () => {
    it('Grouping order with an untopiced clause：價金付款、稅費、未分類', () => {
        const groups = groupClausesByTopic([
            clause('a', '稅費條文', '稅費'),
            clause('b', '價金條文', '價金付款'),
            clause('c', '無主題條文', null),
        ]);
        expect(groups.map((g) => g.topic)).toEqual(['價金付款', '稅費', '未分類']);
    });

    it('沒有條文的主題不輸出段落', () => {
        const groups = groupClausesByTopic([clause('a', '租賃條文', '租賃')]);
        expect(groups).toHaveLength(1);
        expect(groups[0].topic).toBe('租賃');
        expect(groups[0].clauses.map((c) => c.id)).toEqual(['a']);
    });

    it('Ordering inside a topic section：基本特約在前，其餘依標題 zh-TW 排序', () => {
        const groups = groupClausesByTopic([
            clause('use', '車位－使用權車位', '車位'),
            clause('fixed', '車位分管－固定位置，依現況承受', '車位'),
            clause('none', '車位－不含車位', '車位', '基本特約'),
        ]);
        expect(groups[0].clauses.map((c) => c.title)).toEqual([
            '車位－不含車位',
            '車位－使用權車位',
            '車位分管－固定位置，依現況承受',
        ]);
    });

    it('非法主題值與欄位不存在（undefined）都歸入未分類，不丟例外', () => {
        const groups = groupClausesByTopic([
            clause('bad', '亂填主題', '其他'),
            clause('missing', '欄位尚未建立', undefined),
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0].topic).toBe(UNCATEGORIZED);
        expect(groups[0].clauses.map((c) => c.id).sort()).toEqual(['bad', 'missing']);
    });

    it('空陣列回傳空陣列', () => {
        expect(groupClausesByTopic([])).toEqual([]);
    });
});

interface SearchClause {
    id: string;
    title: string;
    content: string;
    note: string | null;
    tags: string[] | null;
    topic: string | null;
}

const searchable = (id: string, over: Partial<SearchClause>): SearchClause => ({
    id, title: '標題', content: '內容', note: null, tags: [], topic: null, ...over,
});

describe('filterClauses', () => {
    const pool = [
        searchable('content', { content: '乙方應提供債權人承諾書', topic: '貸款代償' }),
        searchable('note', { note: '氯離子和結構特約不可以壓在一起', topic: '屋況瑕疵' }),
        searchable('tag', { tags: ['貸款', '排撥'], topic: '貸款代償' }),
        searchable('rent', { title: '租賃排除－交屋前終止租約', topic: '租賃' }),
        searchable('rent2', { title: '租賃承接－二胎代償前換約', topic: '租賃' }),
        searchable('loan', { title: '二胎－過戶前動支履保清償', topic: '貸款代償' }),
        searchable('none', { title: '無主題', topic: null }),
        searchable('latin', { title: 'ABC 條款', topic: '稅費' }),
    ];
    const ids = (list: SearchClause[]) => list.map((c) => c.id).sort();

    it.each([
        ['承諾書', ['content']],
        ['壓在一起', ['note']],
        ['排撥', ['tag']],
        ['不存在字串', []],
    ])('Matching fields：搜尋 %p → %p', (term, expected) => {
        expect(ids(filterClauses(pool, term, null))).toEqual([...expected].sort());
    });

    it('搜尋不分大小寫', () => {
        expect(ids(filterClauses(pool, 'abc', null))).toEqual(['latin']);
    });

    it('Select a topic：選租賃且未搜尋，只剩租賃條文', () => {
        expect(ids(filterClauses(pool, '', '租賃'))).toEqual(['rent', 'rent2']);
    });

    it('Search overrides the topic filter：選租賃時搜尋二胎，跨主題列出', () => {
        expect(ids(filterClauses(pool, '二胎', '租賃'))).toEqual(['loan', 'rent2']);
    });

    it('選未分類只列出無主題條文', () => {
        expect(ids(filterClauses(pool, '', UNCATEGORIZED))).toEqual(['none']);
    });

    it('未選主題且未搜尋時列出全部', () => {
        expect(filterClauses(pool, '', null)).toHaveLength(pool.length);
    });

    it('note 與 tags 為 null 時不丟例外', () => {
        expect(ids(filterClauses([searchable('n', { note: null, tags: null })], 'x', null))).toEqual([]);
    });
});

describe('normalizeClauseNote', () => {
    it.each([
        ['', null],
        ['   ', null],
        ['\n\t ', null],
        [null, null],
        [undefined, null],
        ['先氯離子後結構檢測', '先氯離子後結構檢測'],
        [' 前後空白保留 ', ' 前後空白保留 '],
    ])('Blank note is stored as null：%p → %p', (input, expected) => {
        expect(normalizeClauseNote(input)).toBe(expected);
    });
});

describe('parseTopicGroupKey', () => {
    it.each([
        ['車位', '車位'],
        ['未分類', '未分類'],
        [null, null],
        ['其他', null],
        ['基本特約::標籤', null],
    ])('%p → %p', (input, expected) => {
        expect(parseTopicGroupKey(input)).toBe(expected);
    });
});
