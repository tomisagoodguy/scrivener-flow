/**
 * Frontend-side strategy description registry.
 * 涵蓋 ETF/strategies/__init__.py 的 ALL_STRATEGIES，外加由獨立 FundMomentumStep 產出的 fund_momentum
 * （刻意不在 ALL_STRATEGIES，見 strategy_signal_step.py 的 _EXCLUDED_STRATEGY_ID）。
 */
export function getStrategyDescriptions(): Record<string, string> {
    return {
        super8888: '超級8888 量化選股',
        super888: 'Super888 量化選股',
        capital_layer: 'Capital Layer 多層籌碼選股',
        broker_ranked: '券商籌碼排名選股',
        low_vol_alpha: '低波動 Alpha 年增率選股',
        low_vol_cap: '低波動市值選股',
        htf_gvi: 'HTF GVI 多因子選股',
        trend_template: '趨勢樣板選股',
        fundamental_momentum: '基本面動能選股',
        fund_momentum: '投信買超動能選股',
        fan_breakout: '均線發散突破',
    };
}
