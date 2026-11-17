/**
 * 常用條文庫的主題（單一事實來源）。
 * 須與 supabase/migrations/20261117120000_add_topic_note_to_contract_clauses.sql 的 CHECK 一致；
 * 增減主題時兩處同步修改。
 */
export const CLAUSE_TOPICS = [
    '價金付款',
    '貸款代償',
    '交屋騰空',
    '租賃',
    '車位',
    '屋況瑕疵',
    '增建違建',
    '土地產權',
    '稅費',
    '當事人特殊',
    '預售屋都更',
    '解約違約',
] as const;

export type ClauseTopic = (typeof CLAUSE_TOPICS)[number];

/** 主題為 null（或不在 12 個值內）的條文歸入此段，排在最後 */
export const UNCATEGORIZED = '未分類';
export type ClauseTopicGroupKey = ClauseTopic | typeof UNCATEGORIZED;

const BASIC_CATEGORY = '基本特約';

export function isClauseTopic(value: unknown): value is ClauseTopic {
    return typeof value === 'string' && (CLAUSE_TOPICS as readonly string[]).includes(value);
}

/** 條文所屬的分組鍵；非法值與 undefined（欄位尚未建立）一律視為未分類 */
export function clauseGroupKey(topic: unknown): ClauseTopicGroupKey {
    return isClauseTopic(topic) ? topic : UNCATEGORIZED;
}

interface GroupableClause {
    topic?: string | null;
    category: string;
    title: string;
}

export interface ClauseTopicGroup<T> {
    topic: ClauseTopicGroupKey;
    clauses: T[];
}

const GROUP_ORDER: readonly ClauseTopicGroupKey[] = [...CLAUSE_TOPICS, UNCATEGORIZED];

function compareWithinTopic(a: GroupableClause, b: GroupableClause): number {
    const basicA = a.category === BASIC_CATEGORY ? 0 : 1;
    const basicB = b.category === BASIC_CATEGORY ? 0 : 1;
    if (basicA !== basicB) return basicA - basicB;
    return a.title.localeCompare(b.title, 'zh-TW');
}

/** 依主題固定順序分段；空段不輸出；段內基本特約在前，其餘依標題 zh-TW 排序 */
export function groupClausesByTopic<T extends GroupableClause>(clauses: T[]): ClauseTopicGroup<T>[] {
    const buckets = new Map<ClauseTopicGroupKey, T[]>();
    for (const c of clauses) {
        const key = clauseGroupKey(c.topic);
        const bucket = buckets.get(key);
        if (bucket) bucket.push(c);
        else buckets.set(key, [c]);
    }
    return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
        topic: key,
        clauses: [...(buckets.get(key) ?? [])].sort(compareWithinTopic),
    }));
}

interface FilterableClause {
    title: string;
    content: string;
    note?: string | null;
    tags?: string[] | null;
    topic?: string | null;
}

function matchesSearch(c: FilterableClause, term: string): boolean {
    const fields = [c.title, c.content, c.note ?? '', ...(c.tags ?? [])];
    return fields.some((f) => f.toLowerCase().includes(term));
}

/**
 * 搜尋（不分大小寫）比對標題、內容、備註、標籤；搜尋字非空時跨所有主題，
 * 否則依 selectedTopic（含「未分類」）篩選，null 表示全部。
 */
export function filterClauses<T extends FilterableClause>(
    clauses: T[],
    searchTerm: string,
    selectedTopic: ClauseTopicGroupKey | null,
): T[] {
    const term = searchTerm.trim().toLowerCase();
    if (term) return clauses.filter((c) => matchesSearch(c, term));
    if (!selectedTopic) return clauses;
    return clauses.filter((c) => clauseGroupKey(c.topic) === selectedTopic);
}

/** 空字串或全空白的備註存為 null，其餘原樣保留 */
export function normalizeClauseNote(note: string | null | undefined): string | null {
    if (note == null || note.trim() === '') return null;
    return note;
}

/** 側欄選取值轉回主題分組鍵；不認得的值視為未選取 */
export function parseTopicGroupKey(value: string | null): ClauseTopicGroupKey | null {
    if (value === UNCATEGORIZED || isClauseTopic(value)) return value;
    return null;
}
