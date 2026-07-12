import { isTaiwanStockCode } from '../holdingFilters';

describe('isTaiwanStockCode', () => {
    it('accepts plain 4-digit TW stock codes', () => {
        expect(isTaiwanStockCode('2330')).toBe(true);
        expect(isTaiwanStockCode('3711')).toBe(true);
    });

    it('accepts TW ETF codes with trailing letter', () => {
        expect(isTaiwanStockCode('00981A')).toBe(true);
        expect(isTaiwanStockCode('00982A')).toBe(true);
    });

    it('rejects foreign equity tickers', () => {
        expect(isTaiwanStockCode('NVDA')).toBe(false);
        expect(isTaiwanStockCode('TSLA US')).toBe(false);
    });

    it('rejects ISIN-style bond/foreign codes', () => {
        expect(isTaiwanStockCode('US67066G1040')).toBe(false);
    });
});
