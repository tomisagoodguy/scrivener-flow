# 量化策略整合計劃 (LowVol Alpha YoY Strategy)

> **目標**: 將使用者現有的 Low Volatility Alpha YoY 選股策略整合至 Web 系統,實現自動化選股、資料展示與 LINE 通知。

---

## 🎯 實施進度

| Phase | 階段 | 狀態 | 完成日期 |
| :--- | :--- | :--- | :--- |
| Phase 1 | 資料庫與後端實作 | ✅ 完成 | 2026-02-09 |
| Phase 2 | LINE 通知整合 | ⏸️ 待續 | - |
| Phase 3 | 前端展示頁面 | ✅ 完成 | 2026-02-09 |
| Phase 4 | 測試與部署 | ⏸️ 待續 | - |

---

## 📋 需求概述 (Requirements)

### 核心功能

1. **每月自動選股**: 運行策略計算並產出 Top 10 持股名單
2. **Web 展示**: 在網站上顯示最新的 Top 10 選股結果（含詳細資料）
3. **LINE 通知**: 當選股名單發生變動時，自動發送 LINE 通知

-# 策略整合實施計劃

## 需求概述

整合「LowVol Alpha YoY」量化交易策略到 Web 系統：

- **選股邏輯**：基於營收成長、低波動與技術面篩選的量化選股策略
- **執行頻率**：每月一次（每月 10 號，營收公布後）
- **持股數量**：Top 10 股票
- **資料保留**：僅保留最近 3 個月的資料（月度策略特性）
- **通知機制**：當持股列表有 IN/OUT 異動時發送 LINE 通知

## Phase 1: 資料庫與後端實作

### 1.1 資料庫 Schema

建立 3 張新表格：

#### `strategies` - 策略定義表

```sql
CREATE TABLE strategies (
    strategy_id SERIAL PRIMARY KEY,
    strategy_code VARCHAR(50) UNIQUE NOT NULL,  -- 'low_vol_alpha_yoy'
    strategy_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_holdings INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `strategy_daily_holdings` - 策略持股快照表

**重要**：月度策略只保留最近 3 個月的資料，舊資料會自動清理。

```sql
CREATE TABLE strategy_daily_holdings (
    id SERIAL PRIMARY KEY,
    strategy_code VARCHAR(50) NOT NULL,
    data_date DATE NOT NULL,
    stock_code VARCHAR(10) NOT NULL,
    rank_position INT NOT NULL,                 -- 1-10 排名

    -- 選股當日的關鍵指標快照
    close_price NUMERIC(10, 2),
    revenue_yoy NUMERIC(10, 2),                  -- 營收年增率 (%)
    revenue_mom NUMERIC(10, 2),                  -- 營收月增率 (%)
    amount NUMERIC(15, 2),                       -- 成交金額
    natr NUMERIC(10, 4),                         -- 波動率指標
    rs_rank NUMERIC(10, 4),                      -- 相對強度排名
    price_to_high_pct NUMERIC(10, 2),            -- 距離歷史高點 (%)

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(strategy_code, data_date, stock_code)
);

CREATE INDEX idx_strategy_daily_date ON strategy_daily_holdings(strategy_code, data_date DESC);
```

#### 1.3 選股異動記錄表 `strategy_changes_log`

```sql
CREATE TABLE strategy_changes_log (
    id SERIAL PRIMARY KEY,
    strategy_code VARCHAR(50) NOT NULL,
    data_date DATE NOT NULL,
    change_type VARCHAR(10) NOT NULL,            -- 'IN', 'OUT', 'HOLD'
    stock_code VARCHAR(10) NOT NULL,
    stock_name VARCHAR(50),
    prev_rank INT,                                -- 前一日排名 (若為 IN 則為 NULL)
    new_rank INT,                                 -- 新排名 (若為 OUT 則為 NULL)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_strategy_changes_date ON strategy_changes_log(strategy_code, data_date DESC);
```

---

### 2. 後端實作 (Backend Implementation)

#### 2.1 策略模組封裝 `ETF/strategies/low_vol_alpha.py`

```python
"""
Low Volatility Alpha YoY Strategy

基於營收成長、低波動與技術面篩選的量化選股策略。
"""

from finlab import data
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class LowVolAlphaStrategy:
    """低波動營收成長策略"""

    # 排除股票清單（使用者指定）
    EXCLUDED_STOCKS = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487'
    ]

    def __init__(self):
        self.strategy_code = 'low_vol_alpha_yoy'
        self.strategy_name = '低波動率營收成長策略'
        self.max_holdings = 10

    def calculate_indicators(self, close, n_std=150, n_rsv=180, n_rs=100, n_high=260):
        """計算策略所需的技術指標"""
        std_rank = close.pct_change().rolling(
            n_std, min_periods=int(n_std/2)).std().rank(axis=1, pct=True)

        rsv_rank = ((close - close.rolling(n_rsv, min_periods=int(n_rsv/2)).min()) /
                    (close.rolling(n_rsv, min_periods=int(n_rsv/2)).max() -
                     close.rolling(n_rsv).min())).rank(axis=1, pct=True)

        rs_rank = (close / close.shift(n_rs)).rank(pct=True, axis=1)

        price_to_high_rank = (close / close.rolling(n_high,
                              min_periods=int(n_high/2)).max()).rank(axis=1, pct=True)

        return std_rank, rsv_rank, rs_rank, price_to_high_rank

    def get_data(self):
        """取得策略運算所需的原始資料"""
        with data.universe('TSE_OTC'):
            close = data.get('price:收盤價')
            amt = data.get('price:成交金額')
            rev = data.get('monthly_revenue:當月營收')
            natr = data.indicator('NATR', timeperiod=120)
            rev_yoy_growth = data.get('monthly_revenue:去年同月增減(%)')
            rev_mom_growth = data.get('monthly_revenue:上月比較增減(%)')

        return close, amt, rev, natr, rev_yoy_growth, rev_mom_growth

    def create_conditions(self, std_rank, rsv_rank, rs_rank, amt, natr, rev, close, price_to_high):
        """建立選股條件"""
        conditions = {
            "amt_above_threshold": amt > 1.5 * 10**7,
            "rsv_above_90_pct": rsv_rank > 0.9,
            "low_volatility": std_rank < 0.92,
            "rs_above_50_pct": rs_rank > 0.5,
            "natr_below_65_pct": natr.rank(axis=1, pct=True) < 0.65,
            "revenue_growth_positive": (rev.rolling(3).mean() / rev.rolling(12).mean()).rank(pct=True, axis=1) > 0.8,
            "ma5_trending_up": close.rolling(5).mean().diff().gt(0),
            "price_close_to_high": price_to_high > 0.85,
            "price_above_ma60": close > close.rolling(60).mean(),
            "price_above_ma240": close > close.rolling(240).mean(),
            "ma5_above_ma60": close.rolling(5).mean() > close.rolling(60).mean()
        }
        return conditions

    def run_selection(self, target_date=None):
        """
        執行選股邏輯，返回 Top 10 股票及其詳細資料

        Returns:
            pd.DataFrame: 包含 stock_code, rank, close, revenue_yoy, revenue_mom,
                         amount, natr, rs_rank, price_to_high_pct
        """
        logger.info(f"開始執行 {self.strategy_name} 選股...")

        # 取得資料
        close, amt, rev, natr, rev_yoy, rev_mom = self.get_data()

        # 計算指標
        std_rank, rsv_rank, rs_rank, price_to_high_rank = self.calculate_indicators(close)

        # 建立條件
        conditions = self.create_conditions(
            std_rank, rsv_rank, rs_rank, amt, natr, rev, close, price_to_high_rank
        )

        # 合併條件
        combined_condition = list(conditions.values())[0]
        for condition in list(conditions.values())[1:]:
            combined_condition &= condition

        # 選出 Top 10（依營收年增率排名）
        position = rev_yoy[combined_condition].is_largest(10)

        # 排除指定股票
        position[self.EXCLUDED_STOCKS] = False

        # 取得最新日期的選股結果
        if target_date is None:
            target_date = position.index[-1]

        selected_stocks = position.loc[target_date]
        selected_stocks = selected_stocks[selected_stocks > 0]

        # 整理詳細資料
        results = []
        for i, stock_code in enumerate(selected_stocks.index, 1):
            results.append({
                'stock_code': stock_code,
                'rank_position': i,
                'close_price': close.loc[target_date, stock_code],
                'revenue_yoy': rev_yoy.loc[target_date, stock_code],
                'revenue_mom': rev_mom.loc[target_date, stock_code],
                'amount': amt.loc[target_date, stock_code],
                'natr': natr.loc[target_date, stock_code],
                'rs_rank': rs_rank.loc[target_date, stock_code],
                'price_to_high_pct': (close.loc[target_date, stock_code] /
                                     close.loc[:target_date, stock_code].rolling(260).max().iloc[-1] - 1) * 100
            })

        logger.info(f"✅ 選股完成，共選出 {len(results)} 檔股票")
        return pd.DataFrame(results), target_date
```

#### 2.2 選股執行腳本 `ETF/run_strategy.py`

```python
"""
執行量化策略選股並寫入資料庫
"""

import logging
import argparse
from datetime import datetime
from strategies.low_vol_alpha import LowVolAlphaStrategy
from database.sql_storage import SQLStorage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description='Execute quantitative strategy selection')
    parser.add_argument('--strategy', default='low_vol_alpha_yoy', help='Strategy code')
    args = parser.parse_args()

    # 初始化
    storage = SQLStorage()
    strategy = LowVolAlphaStrategy()

    # 執行選股
    selected_df, data_date = strategy.run_selection()

    if selected_df.empty:
        logger.warning("No stocks selected today.")
        return

    # 儲存結果到資料庫
    storage.upsert_strategy_holdings(
        strategy_code=strategy.strategy_code,
        data_date=data_date,
        holdings_df=selected_df
    )

    # 分析異動並記錄
    changes = storage.detect_strategy_changes(
        strategy_code=strategy.strategy_code,
        current_date=data_date
    )

    if changes:
        storage.log_strategy_changes(changes)
        logger.info(f"檢測到 {len(changes)} 筆持股異動")

    logger.info("✅ 策略執行完成")

if __name__ == '__main__':
    main()
```

#### 2.3 Database Storage 擴充 (`SQLStorage` 新增方法)

```python
def upsert_strategy_holdings(self, strategy_code: str, data_date, holdings_df: pd.DataFrame):
    """批次寫入策略持股結果"""
    records = holdings_df.to_dict('records')
    for record in records:
        record['strategy_code'] = strategy_code
        record['data_date'] = data_date

    with self.engine.connect() as conn:
        stmt = text("""
            INSERT INTO strategy_daily_holdings
            (strategy_code, data_date, stock_code, rank_position,
             close_price, revenue_yoy, revenue_mom, amount, natr, rs_rank, price_to_high_pct)
            VALUES (:strategy_code, :data_date, :stock_code, :rank_position,
                    :close_price, :revenue_yoy, :revenue_mom, :amount, :natr, :rs_rank, :price_to_high_pct)
            ON CONFLICT (strategy_code, data_date, stock_code)
            DO UPDATE SET
                rank_position = EXCLUDED.rank_position,
                close_price = EXCLUDED.close_price,
                revenue_yoy = EXCLUDED.revenue_yoy,
                revenue_mom = EXCLUDED.revenue_mom,
                amount = EXCLUDED.amount,
                natr = EXCLUDED.natr,
                rs_rank = EXCLUDED.rs_rank,
                price_to_high_pct = EXCLUDED.price_to_high_pct,
                created_at = NOW()
        """)
        conn.execute(stmt, records)
        conn.commit()
    logger.info(f"✅ 已寫入 {len(records)} 筆策略持股記錄")

def detect_strategy_changes(self, strategy_code: str, current_date) -> list:
    """檢測持股異動 (IN/OUT)"""
    with self.engine.connect() as conn:
        # 取得前一日持股
        prev_holdings = conn.execute(text("""
            SELECT stock_code, rank_position
            FROM strategy_daily_holdings
            WHERE strategy_code = :strategy_code
              AND data_date < :current_date
            ORDER BY data_date DESC
            LIMIT 10
        """), {'strategy_code': strategy_code, 'current_date': current_date}).fetchall()

        # 取得當日持股
        curr_holdings = conn.execute(text("""
            SELECT stock_code, rank_position, close_price
            FROM strategy_daily_holdings
            WHERE strategy_code = :strategy_code AND data_date = :current_date
        """), {'strategy_code': strategy_code, 'current_date': current_date}).fetchall()

    prev_stocks = {row[0]: row[1] for row in prev_holdings}
    curr_stocks = {row[0]: row[1] for row in curr_holdings}

    changes = []

    # IN: 新加入
    for stock in curr_stocks:
        if stock not in prev_stocks:
            changes.append({
                'strategy_code': strategy_code,
                'data_date': current_date,
                'change_type': 'IN',
                'stock_code': stock,
                'new_rank': curr_stocks[stock]
            })

    # OUT: 移除
    for stock in prev_stocks:
        if stock not in curr_stocks:
            changes.append({
                'strategy_code': strategy_code,
                'data_date': current_date,
                'change_type': 'OUT',
                'stock_code': stock,
                'prev_rank': prev_stocks[stock]
            })

    return changes
```

---

### 3. 前端展示 (Frontend UI)

#### 3.1 新增頁面 `app/investment/strategies/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server';
import StrategyHoldingsCard from '@/components/investment/StrategyHoldingsCard';

export default async function StrategyPage() {
  const supabase = await createClient();

  // 取得最新日期的選股結果
  const { data: holdings } = await supabase
    .from('strategy_daily_holdings')
    .select(`
      *,
      stock_basic_info!inner(name_short)
    `)
    .eq('strategy_code', 'low_vol_alpha_yoy')
    .order('data_date', { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">量化策略選股</h1>

      <StrategyHoldingsCard holdings={holdings || []} />
    </div>
  );
}
```

#### 3.2 UI 元件 `components/investment/StrategyHoldingsCard.tsx`

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StrategyHoldingsCard({ holdings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>🎯 低波動營收成長策略 (Top 10)</span>
          <Badge variant="outline">
            {holdings[0]?.data_date || 'N/A'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {holdings.map((holding) => (
            <div key={holding.stock_code}
                 className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {holding.rank_position}
                </div>
                <div>
                  <div className="font-bold">{holding.stock_code}</div>
                  <div className="text-sm text-muted-foreground">
                    {holding.stock_basic_info.name_short}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">股價</div>
                  <div className="font-semibold">${holding.close_price}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">營收YoY</div>
                  <div className={holding.revenue_yoy > 0 ? 'text-green-600' : 'text-red-600'}>
                    {holding.revenue_yoy?.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">營收MoM</div>
                  <div className={holding.revenue_mom > 0 ? 'text-green-600' : 'text-red-600'}>
                    {holding.revenue_mom?.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">成交額</div>
                  <div>{(holding.amount / 100000000).toFixed(2)}億</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 4. LINE 通知整合

#### 4.1 擴充 `LineNotifier` 類別

```python
def notify_strategy_changes(self, strategy_name: str, changes: list, date_str: str):
    """發送策略選股異動通知"""
    if not changes:
        return

    in_stocks = [c for c in changes if c['change_type'] == 'IN']
    out_stocks = [c for c in changes if c['change_type'] == 'OUT']

    bubble = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": f"🎯 {strategy_name} 選股異動",
                 "weight": "bold", "size": "lg", "color": "#ffffff"},
                {"type": "text", "text": f"日期: {date_str}",
                 "size": "xs", "color": "#ffffffcc", "margin": "xs"}
            ],
            "backgroundColor": "#7C3AED"  # Purple
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": self._build_strategy_change_rows(in_stocks, out_stocks)
        }
    }

    self.send_flex_message(f"{strategy_name} 選股異動", bubble)

def _build_strategy_change_rows(self, in_stocks, out_stocks):
    """建構異動列表"""
    rows = []

    if in_stocks:
        rows.append({"type": "text", "text": "🆕 新加入",
                    "weight": "bold", "color": "#10B981", "margin": "md"})
        for stock in in_stocks:
            rows.append({
                "type": "box",
                "layout": "horizontal",
                "contents": [
                    {"type": "text", "text": stock['stock_name'], "size": "sm", "flex": 3},
                    {"type": "text", "text": stock['stock_code'],
                     "size": "xs", "color": "#aaa", "align": "end"}
                ],
                "margin": "sm"
            })

    if out_stocks:
        rows.append({"type": "text", "text": "❌ 移除",
                    "weight": "bold", "color": "#EF4444", "margin": "md"})
        for stock in out_stocks:
            rows.append({
                "type": "box",
                "layout": "horizontal",
                "contents": [
                    {"type": "text", "text": stock['stock_name'],
                     "size": "sm", "flex": 3, "decoration": "line-through"},
                    {"type": "text", "text": stock['stock_code'],
                     "size": "xs", "color": "#aaa", "align": "end"}
                ],
                "margin": "sm"
            })

    return rows
```

---

### 5. GitHub Actions 整合

#### 5.1 更新 `.github/workflows/etf_daily.yml`

```yaml
- name: Run ETF Tracker
  run: |
    uv run python ETF/main.py --days 30
    uv run python ETF/sync_stock_financials.py --days 30

- name: Run Strategy Selection
  run: |
    uv run python ETF/run_strategy.py --strategy low_vol_alpha_yoy
```

---

## 🎯 實施步驟 (Implementation Checklist)

### Phase 1: 資料庫與後端

- [ ] 建立資料庫 Schema (3 張表)
- [ ] 實作 `LowVolAlphaStrategy` 類別
- [ ] 實作 `run_strategy.py` 執行腳本
- [ ] 擴充 `SQLStorage` 新增策略相關方法
- [ ] 本地測試策略運算與資料寫入

### Phase 2: 自動化排程

- [ ] 整合至 GitHub Actions
- [ ] 驗證每日 22:00 自動執行
- [ ] 確認資料正確寫入 Supabase

### Phase 3: LINE 通知

- [ ] 擴充 `LineNotifier` 支援策略異動通知
- [ ] 測試異動偵測邏輯
- [ ] 驗證 LINE 訊息格式

### Phase 4: 前端展示

- [ ] 建立 `/investment/strategies` 頁面
- [ ] 實作 `StrategyHoldingsCard` 元件
- [ ] 新增導航連結至投資儀表板
- [ ] 測試資料展示與 RLS 權限

### Phase 5: 整合測試

- [ ] 端到端測試完整流程
- [ ] 驗證資料一致性
- [ ] 效能優化（若需要）

---

## ⚠️ 風險與注意事項

1. **Finlab API 限制**: 確認每日 API 呼叫額度是否足夠
2. **運算時間**: 策略運算可能耗時，需確保在 GitHub Actions 時限內完成
3. **資料缺失處理**: 若某日無法取得完整資料，需有容錯機制
4. **排除清單維護**: 未來若需調整 `EXCLUDED_STOCKS`，需提供介面或配置檔

---

## 📝 後續擴充可能性

1. **多策略支援**: 架構已支援多策略並行
2. **回測視覺化**: 未來可加入績效圖表
3. **參數調整介面**: 讓使用者在 Web 上調整策略參數
4. **策略績效追蹤**: 記錄每日淨值與收益率

---

**Author**: Antigravity
**Date**: 2026-02-09
**Status**: 🟡 Pending Approval
