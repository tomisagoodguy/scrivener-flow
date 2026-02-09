# 量化策略選股系統

## ✅ Phase 3 - 前端展示 (已完成)

### 📱 頁面功能

**策略選股頁面**: `/investment/strategies`

#### 功能特色

- ✅ 顯示本月精選 Top 10 股票
- ✅ 即時股價與技術指標
- ✅ 營收年增率 (YoY) / 月增率 (MoM)
- ✅ 成交金額與距離歷史高點
- ✅ 產業分類與股票名稱
- ✅ 點擊可跳轉至個股詳細頁面
- ✅ 異動紀錄追蹤 (IN/OUT)

#### UI 設計

- 採用與 ETF 持股監控一致的設計風格
- Dark Mode 支援
- 響應式設計 (手機/平板/桌面)
- Tabs 切換 (持股明細 / 異動紀錄)
- 漸層排名徽章 (1-10)

### 🔗 導航整合

1. **投資監控頁面** (`/investment`)
   - 新增「量化選股」按鈕，可快速跳轉至策略頁面

2. **策略選股頁面** (`/investment/strategies`)
   - 新增「返回投資監控」連結
   - 選股項目點擊可導向個股儀表板 (`/investment/dashboard/[code]`)

### 📊 資料來源

所有資料來自 Supabase 資料表：

- `strategy_daily_holdings` - 策略持股快照
- `strategy_changes_log` - 異動記錄
- `stock_basic_info` - 股票基本資訊 (名稱、產業)
- `stock_daily_prices` - K 線價格資料 (與 ETF 共用)

### 🎨 元件結構

```text
src/app/investment/strategies/
└── page.tsx  (Server Component - 資料查詢與渲染)
```

### 📈 資料查詢邏輯

```typescript
// 查詢最新選股結果
SELECT * FROM strategy_daily_holdings
WHERE strategy_code = 'low_vol_alpha_yoy'
ORDER BY data_date DESC
LIMIT 10

// 查詢異動記錄
SELECT * FROM strategy_changes_log
WHERE strategy_code = 'low_vol_alpha_yoy'
ORDER BY data_date DESC
LIMIT 50
```

---

## 🔜 下一步

### Phase 2: LINE 通知整合

- [ ] 擴充 `LineNotifier` 類別支援策略異動通知
- [ ] Flex Message 設計 (新進/移除股票)
- [ ] 整合至 `run_strategy.py` 執行腳本
- [ ] 測試異動偵測與通知流程

### Phase 4: 進階功能

-[ ] 策略績效追蹤 (報酬率、最大回撤)

- [ ] 回測視覺化圖表
- [ ] 多策略比較
- [ ] 參數調整介面

---

**建立日期**: 2026-02-09
**狀態**: ✅ Phase 3 完成
