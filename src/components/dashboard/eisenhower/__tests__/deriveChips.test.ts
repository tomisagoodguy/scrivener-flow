import { deriveChips, prunePlacements, parseMatrix, zoneDisplayLabel } from '../chipUtils';
import { DEFAULT_ZONES, MAX_ZONES } from '../types';

describe('deriveChips（一案一卡）', () => {
    // spec Example: chip expansion from case list
    it('依 spec Example：每案一張、卡含買賣雙方姓名、已結案與雙空排除', () => {
        const cases = [
            { id: 'A', case_number: 'C-A', buyer_name: '王小明', seller_name: '陳大文', status: 'Processing' },
            { id: 'B', case_number: 'C-B', buyer_name: '林美麗', seller_name: '', status: 'Processing' },
            { id: 'C', case_number: 'C-C', buyer_name: '張三', seller_name: '李四', status: 'Closed' },
            { id: 'D', case_number: 'C-D', buyer_name: '', seller_name: '  ', status: 'Processing' },
        ];

        const chips = deriveChips(cases);

        expect(chips.map((c) => c.key)).toEqual(['A', 'B']);
        expect(chips[0]).toEqual({
            key: 'A',
            caseId: 'A',
            caseNumber: 'C-A',
            buyerName: '王小明',
            sellerName: '陳大文',
        });
        expect(chips[1].buyerName).toBe('林美麗');
        expect(chips[1].sellerName).toBeNull();
    });

    it('解約（Cancelled）案件不產名片；只有賣方姓名也產一張', () => {
        const cases = [
            { id: 'E', case_number: 'C-E', buyer_name: '  ', seller_name: '吳大城', status: 'Processing' },
            { id: 'F', case_number: 'C-F', buyer_name: '趙六', seller_name: '孫七', status: 'Cancelled' },
        ];

        const chips = deriveChips(cases);

        expect(chips.map((c) => c.key)).toEqual(['E']);
        expect(chips[0].buyerName).toBeNull();
        expect(chips[0].sellerName).toBe('吳大城');
    });
});

describe('prunePlacements（多象限陣列）', () => {
    const zoneIds = new Set(['q1', 'q4']);

    // spec Example: pruning placements against the live chip set
    it('依 spec Example：{A:[q1,z999],B:[q4]} → {A:[q1]}（名片鍵與 zone id 雙重過濾）', () => {
        const placements: Record<string, string[]> = { A: ['q1', 'z999'], B: ['q4'] };

        expect(prunePlacements(placements, new Set(['A']), zoneIds)).toEqual({ A: ['q1'] });
    });

    it('歸屬清空的項目整個刪除', () => {
        const placements: Record<string, string[]> = { A: ['z999'], B: ['q4'] };

        expect(prunePlacements(placements, new Set(['A', 'B']), zoneIds)).toEqual({ B: ['q4'] });
    });

    it('全部有效時回傳等值內容且不改動原物件', () => {
        const placements: Record<string, string[]> = { A: ['q1', 'q4'] };
        const result = prunePlacements(placements, new Set(['A']), zoneIds);

        expect(result).toEqual({ A: ['q1', 'q4'] });
        expect(result).not.toBe(placements); // 回傳新物件，不 mutate
    });
});

describe('parseMatrix（v2 + 舊格式相容）', () => {
    // spec Example: legacy v1 document interpretation
    it('依 spec Example：v1 文件（無 zones）解讀為預設四象限並套用 labels', () => {
        const result = parseMatrix({
            placements: { A: 'q1' },
            labels: { q1: '今天必聯絡' },
        });

        expect(result.zones.map((z) => z.id)).toEqual(['q1', 'q2', 'q3', 'q4']);
        expect(result.zones[0].label).toBe('今天必聯絡');
        expect(result.zones[1].label).toBe('重要不緊急');
        expect(result.placements).toEqual({ A: ['q1'] });
    });

    it('空值 / 髒資料回預設四象限空 placements', () => {
        expect(parseMatrix(null)).toEqual({ zones: DEFAULT_ZONES, placements: {} });
        expect(parseMatrix('garbage')).toEqual({ zones: DEFAULT_ZONES, placements: {} });
    });

    it('v2 字串值視為單元素陣列；v3 陣列去重並過濾非現存 zone id；zones 超過上限截斷', () => {
        const zones = Array.from({ length: MAX_ZONES + 2 }, (_, i) => ({ id: `z${i}`, label: `區${i}` }));
        const result = parseMatrix({
            zones,
            placements: { A: 'z0', B: ['z1', 'z1', 'not-a-zone'], C: ['not-a-zone'] },
        });

        expect(result.zones).toHaveLength(MAX_ZONES);
        expect(result.placements).toEqual({ A: ['z0'], B: ['z1'] });
    });
});

describe('zoneDisplayLabel（標題 fallback）', () => {
    it('有標題時回自身標題', () => {
        expect(zoneDisplayLabel({ id: 'q1', label: '今天必聯絡' })).toBe('今天必聯絡');
    });

    it('標題空白時：q1–q4 回艾森豪預設詞、自訂象限回「新象限」', () => {
        expect(zoneDisplayLabel({ id: 'q1', label: '' })).toBe('重要且緊急');
        expect(zoneDisplayLabel({ id: 'q3', label: '   ' })).toBe('緊急不重要');
        expect(zoneDisplayLabel({ id: 'z1720000000', label: '' })).toBe('新象限');
    });
});
