'use server';

import { createClient } from '@/lib/supabase/server';
import { genAI, ALLOWED_EMAIL, MODELS_TO_TRY } from '@/lib/ai/geminiConfig';
import { Holding } from '@/types/investment';

interface GeneratePromptProps {
    holdings: Holding[];
    dataDate: string;
}

interface StockTechnicalData {
    code: string;
    ma5: number;
    ma10: number;
    ma20: number;
    rsi6: number | null;
    itBuy5d: number;
    itBuy10d: number;  // 投信 10日累積
    itBuy20d: number;
    lastClose: number;
    trend: 'Bullish' | 'Bearish' | 'Neutral';
    brokerNetBuy20d?: number;
    largeShareholderTrend?: 'Increasing' | 'Decreasing' | 'Stable';
    retailShareholderTrend?: 'Increasing' | 'Decreasing' | 'Stable';
    // === 三大量化 Filter ===
    momentum60d: number | null;          // close/close[60]-1，動能百分比
    momentumPass: boolean;               // filter: momentum > 0
    itBuy10dSum: number;                 // 投信 10日累積買超張數
    itBuy10dPass: boolean;               // filter: itBuy10dSum > 0
    revMa3: number | null;               // 最新 3月均營收
    revMa3IsNewHigh: boolean;            // filter: rev_ma3 == rev_ma3.rolling(12).max()
    filterScore: number;                 // 通過幾個 filter (0~3)
}

export async function generateInvestmentPromptAction({ holdings, dataDate }: GeneratePromptProps) {
    if (!genAI) return { success: false, message: 'API Key missing' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        return { success: false, message: 'Access Denied: 您沒有權限使用此功能' };
    }

    try {
        const targetCodes = new Set(holdings.map(h => h.stock_code));
        const targetCodeList = Array.from(targetCodes);

        const topHoldings = holdings.map(h => ({
            name: h.stock_name,
            code: h.stock_code,
            weight: h.weight,
            price: h.price,
            industry: h.industry,
            yoy: h.revenue_yoy,
            mom: h.revenue_mom
        }));

        const stats = {
            totalHoldings: holdings.length,
            top10Weight: holdings.slice(0, 10).reduce((sum, h) => sum + (h.weight || 0), 0).toFixed(2),
            avgYoY: (holdings.reduce((sum, h) => sum + (h.revenue_yoy || 0), 0) / holdings.length).toFixed(2)
        };

        const technicalMap: Record<string, StockTechnicalData> = {};

        // (A) 價格與投信買賣超：抓 65 天以計算 60 日動能 + MA 系列
        const { data: priceData } = await supabase
            .from('stock_prices_daily')
            .select('stock_code, data_date, close, it_buy')
            .in('stock_code', targetCodeList)
            .order('data_date', { ascending: false })
            .limit(65 * targetCodeList.length);

        // (B) 主力券商買賣超
        const { data: brokerData } = await supabase
            .from('stock_broker_transactions')
            .select('stock_code, net_volume, data_date')
            .in('stock_code', targetCodeList)
            .order('data_date', { ascending: false })
            .limit(20 * targetCodeList.length);

        // (C) 股權分散
        const { data: chipsData } = await supabase
            .from('stock_shareholder_weekly')
            .select('stock_code, data_date, shareholder_tier, custody_ratio')
            .in('stock_code', targetCodeList)
            .in('shareholder_tier', [1, 2, 3, 4, 5, 15])
            .order('data_date', { ascending: false })
            .limit(10 * 6 * targetCodeList.length);

        // (D) 月營收：抓 14 個月以計算 rev_ma3.rolling(12).max()
        //     rolling(12) 的 ma3 需要: 最新 ma3 需要第 1-3 月, max 需要往前 12 個 ma3
        //     實際需要最多 12+2 = 14 個月
        const { data: revenueData } = await supabase
            .from('stock_revenue_monthly')
            .select('stock_code, data_date, revenue')
            .in('stock_code', targetCodeList)
            .order('data_date', { ascending: false })
            .limit(15 * targetCodeList.length);

        // 整合數據
        for (const code of targetCodeList) {
            // ---- 價格資料排序 (新→舊) ----
            const stockPrices = (priceData?.filter(p => p.stock_code === code) || [])
                .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

            let ma5 = 0, ma10 = 0, ma20 = 0, lastClose = 0;
            let itBuy5d = 0, itBuy10d = 0, itBuy20d = 0;
            let trend: StockTechnicalData['trend'] = 'Neutral';
            let momentum60d: number | null = null;
            let momentumPass = false;
            let itBuy10dPass = false;

            if (stockPrices.length >= 20) {
                const closes = stockPrices.map(p => Number(p.close));
                const itBuys = stockPrices.map(p => Number(p.it_buy || 0));

                lastClose = closes[0];
                ma5 = closes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
                ma10 = closes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
                ma20 = closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;

                itBuy5d = itBuys.slice(0, 5).reduce((a, b) => a + b, 0);
                itBuy10d = itBuys.slice(0, 10).reduce((a, b) => a + b, 0);
                itBuy20d = itBuys.slice(0, 20).reduce((a, b) => a + b, 0);

                // Filter 1: Momentum = close / close[60] - 1
                if (stockPrices.length >= 61) {
                    const close60 = closes[60]; // index 60 = 60個交易日前的收盤價
                    if (close60 > 0) {
                        momentum60d = (closes[0] / close60 - 1);
                        momentumPass = momentum60d > 0;
                    }
                }

                // Filter 2: 投信 10日累積 > 0
                itBuy10dPass = itBuy10d > 0;

                if (lastClose > ma5 && ma5 > ma20) trend = 'Bullish';
                else if (lastClose < ma5 && ma5 < ma20) trend = 'Bearish';
            }

            // ---- Broker ----
            const stockBroker = brokerData?.filter(b => b.stock_code === code) || [];
            const brokerNetBuy20d = stockBroker.slice(0, 20).reduce((sum, b) => sum + (b.net_volume || 0), 0);

            // ---- Shareholder Chips ----
            const stockChips = chipsData?.filter(c => c.stock_code === code) || [];
            const chipsByDate: Record<string, { large: number; retail: number }> = {};
            stockChips.forEach(c => {
                if (!chipsByDate[c.data_date]) chipsByDate[c.data_date] = { large: 0, retail: 0 };
                if (c.shareholder_tier === 15) chipsByDate[c.data_date].large = c.custody_ratio || 0;
                else if (c.shareholder_tier <= 5) chipsByDate[c.data_date].retail += (c.custody_ratio || 0);
            });
            const sortedDates = Object.keys(chipsByDate).sort().reverse();
            let largeTrend: StockTechnicalData['largeShareholderTrend'] = 'Stable';
            let retailTrend: StockTechnicalData['retailShareholderTrend'] = 'Stable';
            if (sortedDates.length >= 4) {
                const currentLarge = chipsByDate[sortedDates[0]].large;
                const prevLarge = chipsByDate[sortedDates[3]].large;
                if (currentLarge > prevLarge + 0.5) largeTrend = 'Increasing';
                else if (currentLarge < prevLarge - 0.5) largeTrend = 'Decreasing';

                const currentRetail = chipsByDate[sortedDates[0]].retail;
                const prevRetail = chipsByDate[sortedDates[3]].retail;
                if (currentRetail > prevRetail + 0.5) retailTrend = 'Increasing';
                else if (currentRetail < prevRetail - 0.5) retailTrend = 'Decreasing';
            }

            // ---- Filter 3: Rev New High (rev_ma3 == rev_ma3.rolling(12).max()) ----
            const stockRevenues = (revenueData?.filter(r => r.stock_code === code) || [])
                .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

            let revMa3: number | null = null;
            let revMa3IsNewHigh = false;

            // 計算各個月的 rev_ma3 (3月移動平均):
            // revMa3[i] = (revenue[i] + revenue[i+1] + revenue[i+2]) / 3
            // 需要 index 0~14: 最新 ma3 需要 0,1,2; rolling(12) max 需要 ma3[0]~ma3[11]
            if (stockRevenues.length >= 14) {
                // 計算 14 個月中能算出的 rev_ma3 序列 (共 12 個 ma3 對應 rolling window)
                const ma3Series: number[] = [];
                // ma3Series[0] = revMa3 at latest month, ma3Series[11] = revMa3 at 11 months ago
                for (let i = 0; i <= 11; i++) {
                    const avg = (Number(stockRevenues[i]?.revenue || 0)
                        + Number(stockRevenues[i + 1]?.revenue || 0)
                        + Number(stockRevenues[i + 2]?.revenue || 0)) / 3;
                    ma3Series.push(avg);
                }
                revMa3 = ma3Series[0];
                const rollingMax = Math.max(...ma3Series);
                // rev_ma3 == rev_ma3.rolling(12).max() 等價於最新 ma3 是過去 12 個 ma3 中最大值
                revMa3IsNewHigh = revMa3 > 0 && Math.abs(revMa3 - rollingMax) < 0.01;
            } else if (stockRevenues.length >= 3) {
                // 至少算最新 ma3
                revMa3 = (Number(stockRevenues[0]?.revenue || 0)
                    + Number(stockRevenues[1]?.revenue || 0)
                    + Number(stockRevenues[2]?.revenue || 0)) / 3;
            }

            // Filter 綜合評分 (0~3)
            const filterScore = (momentumPass ? 1 : 0) + (itBuy10dPass ? 1 : 0) + (revMa3IsNewHigh ? 1 : 0);

            technicalMap[code] = {
                code,
                lastClose,
                ma5: Number(ma5.toFixed(2)),
                ma10: Number(ma10.toFixed(2)),
                ma20: Number(ma20.toFixed(2)),
                rsi6: null,
                itBuy5d,
                itBuy10d,
                itBuy20d,
                brokerNetBuy20d,
                largeShareholderTrend: largeTrend,
                retailShareholderTrend: retailTrend,
                trend,
                momentum60d: momentum60d !== null ? Number((momentum60d * 100).toFixed(2)) : null, // 轉換為百分比
                momentumPass,
                itBuy10dSum: itBuy10d,
                itBuy10dPass,
                revMa3: revMa3 !== null ? Number(revMa3.toFixed(0)) : null,
                revMa3IsNewHigh,
                filterScore
            };
        }

        // 統計三大 Filter 通過狀況
        const allStocks = Object.values(technicalMap);
        const filterStats = {
            momentum_pass: allStocks.filter(s => s.momentumPass).length,
            it_buy_pass: allStocks.filter(s => s.itBuy10dPass).length,
            rev_new_high_pass: allStocks.filter(s => s.revMa3IsNewHigh).length,
            triple_pass: allStocks.filter(s => s.filterScore === 3).length,
            double_pass: allStocks.filter(s => s.filterScore === 2).length,
        };

        // 三大 Filter 全過的「超強股」清單
        const triplePassStocks = allStocks
            .filter(s => s.filterScore === 3)
            .map(s => {
                const h = holdings.find(h => h.stock_code === s.code);
                return {
                    code: s.code,
                    name: h?.stock_name || s.code,
                    weight: h?.weight || 0,
                    momentum60d: s.momentum60d,
                    itBuy10d: s.itBuy10d,
                    revMa3: s.revMa3,
                    trend: s.trend
                };
            })
            .sort((a, b) => (b.weight || 0) - (a.weight || 0));

        // 雙 Filter 通過（不含三全）
        const doublePassStocks = allStocks
            .filter(s => s.filterScore === 2)
            .map(s => {
                const h = holdings.find(h => h.stock_code === s.code);
                return {
                    code: s.code,
                    name: h?.stock_name || s.code,
                    weight: h?.weight || 0,
                    momentumPass: s.momentumPass,
                    itBuy10dPass: s.itBuy10dPass,
                    revMa3IsNewHigh: s.revMa3IsNewHigh,
                };
            })
            .sort((a, b) => (b.weight || 0) - (a.weight || 0));

        // 構建 AI Prompt
        const systemPrompt = `
你是一位頂尖的 ETF 基金經理人、量化策略師與籌碼分析師。請根據以下提供的 00981A (主動統一台股增長 ETF) **全數持股**數據，深度解析該基金的**量化篩選結果**與**投資組合風險**。

### 1. 投資組合概況 (Portfolio Overview)
- **資料日期**：${dataDate}
- **持股檔數**：${stats.totalHoldings} 檔
- **前十大持股權重佔比**：${stats.top10Weight}% (集中度指標)
- **平均營收年增率 (YoY)**：${stats.avgYoY}%

### 2. 三大量化 Filter 篩選結果
以下三個 Filter 是業界公認的動能/籌碼/基本面複合篩選條件：

| Filter | 條件 | 通過檔數 / 總持股 |
|--------|------|---------|
| **Momentum** | close / close[60日前] - 1 > 0 | **${filterStats.momentum_pass} / ${stats.totalHoldings}** |
| **投信10日買超** | 投信10日累積買超 > 0張 | **${filterStats.it_buy_pass} / ${stats.totalHoldings}** |
| **Rev New High** | 月營收3MA達12個月新高 | **${filterStats.rev_new_high_pass} / ${stats.totalHoldings}** |
| **🏆 三大全過** | 以上三者全部通過 | **${filterStats.triple_pass} / ${stats.totalHoldings}** |
| **雙 Filter通過** | 任兩項通過 | **${filterStats.double_pass} / ${stats.totalHoldings}** |

### 3. 🏆 三大 Filter 全過個股 (Triple Pass - 最強信號)
${triplePassStocks.length > 0
    ? JSON.stringify(triplePassStocks, null, 2)
    : '(本期無個股同時通過三大 Filter)'}

### 4. 雙 Filter 通過個股 (Double Pass - 次強信號)
${doublePassStocks.slice(0, 15).map(s =>
    `${s.code} (權重${s.weight?.toFixed(2)}%) | 動能:${s.momentumPass ? '✅' : '❌'} 投信:${s.itBuy10dPass ? '✅' : '❌'} RevNewHigh:${s.revMa3IsNewHigh ? '✅' : '❌'}`
).join('\n') || '(無)'}

### 5. 個股全方位數據 (包含三大 Filter 詳細數值)
${JSON.stringify(technicalMap, null, 2)}
*(momentum60d 單位為%, revMa3 為3月均營收(千元), filterScore=0~3 三大Filter通過數)*

### 6. 基本面與權重數據
${JSON.stringify(topHoldings, null, 2)}

---

### 分析報告要求
請以 **Markdown** 格式輸出，語氣專業且犀利，這是一份給投資人的「ETF 量化體檢報告」。請依序完成以下七個章節：

---

#### 1. 🎯 三大量化 Filter 解讀 (Quantitative Screening)
- **整體通過率解析**：目前三大 Filter 的通過比例反映什麼樣的市場環境？
  - **Momentum (60日動能)**：通過率代表趨勢整體方向，超過半數通過代表多頭格局
  - **投信 10日累積買超**：代表法人短期資金動向是否積極佈局
  - **Rev New High (Rev MA3 創12月新高)** ⭐：這是最難造假、最有預測力的基本面動能信號，請**特別詳細**解讀通過的個股
- **Triple Pass 個股重點分析**：三大 Filter 全過的股票是最強複合信號，請逐一說明其技術面(Trend)、籌碼面(主力/大戶)與權重配置是否一致？

---

#### 2. 🕵️‍♂️ 經理人選股邏輯 (Manager's Preference)
- **經理人最愛誰？** 從權重配置 (weight) 來看，哪幾檔是重倉標的？這些股票屬於「高成長攻擊型」還是「高殖利率防守型」？
- **持股集中度解讀**：前十大持股佔比 ${stats.top10Weight}%，這是「重押菁英」還是「分散風險」策略？對績效有何影響？
- **量化信號 vs 經理人判斷**：高權重股中，哪些同時獲得量化 Filter 支持？哪些是「經理人相信但量化不認可」的純主觀判斷？

---

#### 3. 🔬 核心持股深度檢視 (Core Holdings Review)
- 針對 **權重最高的前幾名 (Top Holdings)** 進行嚴格檢視：
  - 這些重倉股的技術趨勢 (Trend)、籌碼面 (主力券商 brokerNetBuy20d、大戶 largeShareholderTrend、投信 itBuy10d)、及量化 Filter (filterScore) 是否健康？
  - **有無「經理人看走眼」的重倉股**？(例如：filterScore=0、營收年增率負成長、法人在賣、技術面 Bearish 的拖油瓶)

---

#### 4. 🚀 潛力黑馬挖掘 (Hidden Gems)
- 在**中低權重**持股中，找出 **「Rev New High (revMa3IsNewHigh=true) + 技術面多頭 (Bullish) + 籌碼集中 (大戶增持/主力淨買)」** 的潛力股。
- 這些可能是經理人未來將加碼的標的，財報動能正在爆發，值得投資人特別追蹤。
- 也可點名「雙 Filter 通過且 RevNewHigh」但權重偏低的錯誤定價機會。

---

#### 5. ⚠️ 風險雷區 (Risk Alert)
- 點名目前 **基本面與籌碼面雙殺** 的高風險持股：
  - 營收 YoY 負成長 + 主力賣超 (brokerNetBuy20d < 0) + filterScore = 0
- 若投資人有單獨持有這些個股，建議主動規避。
- 說明這些股票對 ETF 整體績效的潛在拖累程度（依權重估算）。

---

#### 6. 📊 量化 vs 籌碼 交叉驗證 (Cross Validation)
- 找出「量化 Filter 與籌碼面訊號一致」的個股（例如：momentumPass=true 且 largeShareholderTrend=Increasing）
- 找出「量化 Filter 與籌碼面訊號背離」的個股（例如：revMa3IsNewHigh=true 但主力大賣），這類背離值得深入解釋。

---

#### 7. 💡 總結評分與操作建議 (Conclusion)
- 給出 ETF 整體「量化健康度」綜合評分 **(1-10分)**，評分依據：
  - Filter 通過比例
  - 重倉股的量化品質
  - 籌碼面的法人動向一致性
  - 平均營收動能 (avgYoY: ${stats.avgYoY}%)
- **三行結論**：
  1. 目前這檔 ETF 的整體體質屬於？
  2. 最值得關注的 1~2 檔個股？
  3. 建議投資人「加碼」、「持有觀望」還是「謹慎減碼」？說明理由。

(請直接輸出報告內容，不需任何開場白)
`;

        let lastError = null;
        for (const modelName of MODELS_TO_TRY) {
            try {
                console.log(`🤖 嘗試呼叫 AI 模型: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(systemPrompt);
                const analysisReport = result.response.text();

                if (analysisReport) {
                    console.log(`✅ 成功使用 ${modelName} 生成報告`);
                    return { success: true, prompt: analysisReport };
                }
            } catch (e: unknown) {
                const err = e as Error;
                console.warn(`⚠️ 模型 ${modelName} 呼叫失敗:`, err.message);
                lastError = err;
                continue;
            }
        }

        console.error('❌ 所有 AI 模型均呼叫失敗', lastError);
        return { success: false, message: '生成失敗，所有 AI 模型忙碌中或額度已用盡，請稍後再試。' };

    } catch (e: unknown) {
        const err = e as Error;
        console.error('Generate Prompt Logic Error:', err);
        return { success: false, message: '系統發生錯誤，請稍後再試。' };
    }
}
