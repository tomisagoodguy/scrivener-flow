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
    itBuy5d: number; // Investment Trust Net Buy 5 days
    itBuy20d: number; // Investment Trust Net Buy 20 days
    lastClose: number;
    trend: 'Bullish' | 'Bearish' | 'Neutral';
    brokerNetBuy20d?: number; // Broker Net Buy 20 days (Main Force)
    largeShareholderTrend?: 'Increasing' | 'Decreasing' | 'Stable'; // >400 or >1000 shares
    retailShareholderTrend?: 'Increasing' | 'Decreasing' | 'Stable'; // <10 shares
}

export async function generateInvestmentPromptAction({ holdings, dataDate }: GeneratePromptProps) {
    if (!genAI) return { success: false, message: 'API Key missing' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 安全性檢查
    if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        return { success: false, message: 'Access Denied: 您沒有權限使用此功能' };
    }

    try {
        // 1. 鎖定關鍵分析對象：全數持股 (00981 所有成分股)
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

        // 2. 批次獲取技術與籌碼數據 (Technical & Chips)
        const technicalMap: Record<string, StockTechnicalData> = {};

        // (A) 價格與投信買賣超 (Price & IT Buy)
        const { data: priceData } = await supabase
            .from('stock_prices_daily')
            .select('stock_code, data_date, close, it_buy')
            .in('stock_code', targetCodeList)
            .order('data_date', { ascending: false })
            .limit(60 * targetCodeList.length); // 取足夠的天數計算 MA (放寬到 60 以確保有足夠交易日)

        // (B) 主力券商買賣超 (Broker Transactions)
        const { data: brokerData } = await supabase
            .from('stock_broker_transactions')
            .select('stock_code, net_volume, data_date')
            .in('stock_code', targetCodeList)
            .order('data_date', { ascending: false })
            .limit(20 * targetCodeList.length);

        // (C) 股權分散 (Shareholder Weekly)
        const { data: chipsData } = await supabase
            .from('stock_shareholder_weekly')
            .select('stock_code, data_date, shareholder_tier, custody_ratio')
            .in('stock_code', targetCodeList)
            .in('shareholder_tier', [1, 2, 3, 4, 5, 15]) // 1-5: 散戶, 15: 大戶
            .order('data_date', { ascending: false })
            .limit(10 * 6 * targetCodeList.length); // 取近 10 週

        // 3. 整合數據
        for (const code of targetCodeList) {
            // (A) Process Price & IT Trend
            const stockPrices = priceData?.filter(p => p.stock_code === code)
                .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime()) || [];

            let ma5 = 0, ma10 = 0, ma20 = 0, lastClose = 0, itBuy5d = 0, itBuy20d = 0, trend: any = 'Neutral';

            if (stockPrices.length >= 20) {
                const closes = stockPrices.map(p => Number(p.close));
                const itBuys = stockPrices.map(p => Number(p.it_buy || 0));

                lastClose = closes[0];
                ma5 = closes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
                ma10 = closes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
                ma20 = closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;

                itBuy5d = itBuys.slice(0, 5).reduce((a, b) => a + b, 0);
                itBuy20d = itBuys.slice(0, 20).reduce((a, b) => a + b, 0);

                if (lastClose > ma5 && ma5 > ma20) trend = 'Bullish';
                else if (lastClose < ma5 && ma5 < ma20) trend = 'Bearish';
            }

            // (B) Process Broker Net Buy (Last 20 Days)
            const stockBroker = brokerData?.filter(b => b.stock_code === code) || [];
            const brokerNetBuy20d = stockBroker.slice(0, 20).reduce((sum, b) => sum + (b.net_volume || 0), 0);

            // (C) Process Shareholder Trend (Large vs Retail)
            const stockChips = chipsData?.filter(c => c.stock_code === code) || [];
            
            // Group and Sort Logic...
            const chipsByDate: Record<string, { large: number, retail: number }> = {};
            stockChips.forEach(c => {
                if (!chipsByDate[c.data_date]) chipsByDate[c.data_date] = { large: 0, retail: 0 };
                if (c.shareholder_tier === 15) chipsByDate[c.data_date].large = c.custody_ratio || 0;
                else if (c.shareholder_tier <= 5) chipsByDate[c.data_date].retail += (c.custody_ratio || 0);
            });
            
            const sortedDates = Object.keys(chipsByDate).sort().reverse(); 
            let largeTrend: any = 'Stable';
            let retailTrend: any = 'Stable';

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

            technicalMap[code] = {
                code,
                lastClose,
                ma5: Number(ma5.toFixed(2)),
                ma10: Number(ma10.toFixed(2)),
                ma20: Number(ma20.toFixed(2)),
                rsi6: null,
                itBuy5d,
                itBuy20d,
                brokerNetBuy20d,
                largeShareholderTrend: largeTrend,
                retailShareholderTrend: retailTrend,
                trend
            };
        }


        // 4. 構建 Prompt 給 Gemini
        const systemPrompt = `
你是一位頂尖的 ETF 基金經理人與籌碼分析師。請根據以下提供的 00981 (半導體收益 ETF) **全數持股**數據，深度解析該基金的**投資組合配置邏輯**與**經理人選股偏好**。

### 1. 投資組合概況 (Portfolio Overview)
- **資料日期**：${dataDate}
- **持股檔數**：${stats.totalHoldings} 檔
- **前十大持股權重佔比**：${stats.top10Weight}% (集中度指標)
- **平均營收年增率 (YoY)**：${stats.avgYoY}% (成長動能指標)

### 2. 個股全方位掃描 (Full Holdings Analysis)
包含所有成分股的技術面 (均線趨勢)、籌碼面 (投信/主力/大戶動向) 與權重配置：
${JSON.stringify(technicalMap, null, 2)}
*(註：Trend=多空趨勢, itBuy=投信買賣超, brokerNetBuy=主力券商買賣超)*

### 3. 基本面與權重數據 (Fundamental & Weights)
${JSON.stringify(topHoldings, null, 2)}

---

### 分析報告要求
請以 **Markdown** 格式輸出，語氣專業且犀利，這是一份要給投資人的「基金體檢報告」，請重點回答以下問題：

#### 1. �️‍♂️ 經理人的選股邏輯 (Manager's Preference)
- **經理人最愛誰？** 從權重配置 (Weight) 來看，經理人重倉了哪些個股？這些股票是屬於「高成長攻擊型」還是「高殖利率防守型」？
- **持股集中度**：經理人是採取「重押少數菁英股」還是「分散風險」的策略？這對績效有何影響？

#### 2. � 核心持股檢視 (Core Holdings Review)
- 針對 **權重最高的前幾名 (Top Holdings)** 進行嚴格檢視：
  - 這些重倉股目前的技術面 (Trend) 與籌碼面 (主力/大戶) 是否健康？
  - **有無「經理人看走眼」的重倉股**？(例如權重高但營收衰退、法人在賣、技術面破線的拖油瓶)。

#### 3. 🚀 潛力黑馬挖掘 (Hidden Gems)
- 在中低權重持股中，找出 **「營收高成長 + 籌碼集中 (大戶增持) + 技術面多頭」** 的潛力股。
- 這可能是經理人未來可能加碼的標的，值得投資人自行關注。

#### 4. ⚠️ 風險與雷區 (Risk Alert)
- 點名哪些持股目前 **基本面與籌碼面雙殺** (營收爛、主力賣)，建議投資人若有持有個股應避開。

#### 5. 💡 總結與操作建議
- 給出這檔 ETF 目前的綜合評分 (1-10分)。
- 建議投資人：是該跟隨經理人腳步「買進持有」，還是目前的持股結構有隱憂，建議「觀望」？

(請直接輸出報告內容，不需開場白)
`;

        // 5. 呼叫 Gemini with Fallback Strategy
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
            } catch (e: any) {
                console.warn(`⚠️ 模型 ${modelName} 呼叫失敗:`, e.message);
                lastError = e;
                // Continue to next model
                continue;
            }
        }

        console.error('❌ 所有 AI 模型均呼叫失敗', lastError);
        return { success: false, message: '生成失敗，所有 AI 模型忙碌中或額度已用盡，請稍後再試。' };

    } catch (e: any) {
        console.error('Generate Prompt Logic Error:', e);
        return { success: false, message: '系統發生錯誤，請稍後再試。' };
    }
}
