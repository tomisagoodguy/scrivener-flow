/** Frontend-side strategy description registry (mirrors ETF/strategies/__init__.py). */
export function getStrategyDescriptions(): Record<string, string> {
    return {
        super8888: '超級8888 量化選股',
        capital_layer: 'Capital Layer 多層籌碼選股',
        broker_ranked: '券商籌碼排名選股',
        low_vol_alpha: '低波動 Alpha 年增率選股',
        low_vol_cap: '低波動市值選股',
    };
}
