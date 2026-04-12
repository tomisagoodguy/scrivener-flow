# 計畫：ETF 選股池 Excel 下載 + 裸K看盤雲端化

## Context

用戶目前工作流程：
1. 在 case-master.com/investment 查看主動式 ETF 選股池（11 支 ETF 合併）
2. 手動維護 `EOCS/select_stock.xlsx`（按策略分欄的股票代號）
3. 每天在本機打開 `EOCS/裸K看盤.ipynb` → 手動點執行 → 等待 5~10 分鐘 → 瀏覽生成的 HTML

**痛點**：兩個系統脫節——網站的 ETF 選股池無法自動流入看盤工具；每天必須手動執行。

**目標**：
1. 投資頁面新增 Excel 下載（兩種格式），可直接丟進 Notebook 用
2. 將裸K看盤邏輯雲端化：GitHub Actions 自動執行 → 上傳 HTML → LINE 通知 → 網站可直接查看

---

## Feature 1：ETF 選股池 Excel 下載

### 新增 API Endpoint
**檔案**：`src/app/api/investment/export-excel/route.ts`

使用 `exceljs`（現有，案件模組已有 `ExportExcelButton.tsx`）。

**兩個工作表同在一個 `.xlsx`**：

**Sheet 1「選股策略」**（格式相容 select_stock.xlsx）：
```
| 全部池 | 三大全過 | 雙Filter | 動能通過 | 投信通過 | 營收新高 |
|--------|----------|----------|----------|----------|----------|
| 2317   | 2317     | 2891     | 2408     | 3231     | 2344     |
| 2882   | ...      | ...      | ...      | ...      | ...      |
```
- 每欄對應一個 FILTER_DEFINITIONS（`triple_pass`, `double_pass`, `momentum`, `it_buy`, `rev_new_high`）
- 可直接作為 notebook 的 select_stock.xlsx 替換

**Sheet 2「完整指標」**：
```
| 代號 | 名稱 | ETF來源 | 權重% | 分數 | 動能 | 投信10日 | 營收新高 | 產業 | 價格 | 漲跌% |
```
- 所有量化指標一覽

**API 邏輯**：
1. 呼叫現有的 holdings API 邏輯（重用 `route.ts` 的 `buildUnionHoldings`）
2. 取得量化篩選資料（重用 `fetchQuantFilters` 邏輯）
3. 用 `exceljs` 組裝兩個 Sheet
4. 回傳 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### 新增下載按鈕
**檔案**：`src/app/investment/page.tsx`（或投資頁面的 Header 區域）

在選股池頁面頂部加一個「⬇ 下載 Excel」按鈕，點擊後直接觸發瀏覽器下載。

---

## Feature 2：裸K看盤雲端化

### 2-1 建立 Python 報告腳本
**新增檔案**：`ETF/stock_chart_report.py`

邏輯（參考 `EOCS/裸K看盤.ipynb` 翻譯為可排程的腳本）：

1. **取得選股清單**：從 Supabase 查詢 ETF union pool（無需 Excel 輸入）
   - 重用 `ETF/database/sql_storage.py` 的 SQLAlchemy 連線
   - 查詢 `etf_holdings_snapshot` + `etf_stock_overlap`

2. **取得各股數據**：
   - 日K / 均線：`stock_prices_daily`（已在 DB）
   - 月營收 YoY/MoM：`stock_revenue_monthly`（已在 DB）
   - 融資使用率：`stock_prices_daily.margin_ratio`（已在 DB）
   - 投信買超：`stock_prices_daily.it_buy`（已在 DB）
   - 集保籌碼：`stock_shareholder_weekly`（已在 DB）
   - **直接查 DB，不需要 FinLab SDK**（資料已由 pipeline 同步好）

3. **產生圖表**（Plotly，6層疊放）：
   - K線 + MA5/20/60/120 + 260日高點
   - 訊號條（5個布林）
   - 成交量
   - 融資維持率
   - 月營收 YoY/MoM
   - 集保籌碼

4. **輸出 HTML**：
   - 所有股票合成單一 HTML（頂部有代號目錄）
   - 檔名：`etf_pool_chart_YYYY-MM-DD.html`

5. **上傳 Supabase Storage**：
   - Bucket：`investment-reports`（新建 public bucket）
   - 保留最近 30 天

6. **LINE 通知**：
   - 重用 `ETF/daily_ai_report.py` 的 LINE 推送邏輯
   - 傳送當天報告的 Storage URL + 選股摘要

### 2-2 GitHub Actions 工作流
**新增檔案**：`.github/workflows/etf_chart_report.yml`

```yaml
schedule:
  - cron: '45 7 * * 1-5'  # UTC 07:45 = 台灣 15:45（盤後 15 分）

steps:
  - name: Run Chart Report
    run: uv run python ETF/stock_chart_report.py
```

Secrets 已有：`SUPABASE_SERVICE_ROLE_KEY`、`LINE_CHANNEL_ACCESS_TOKEN`

### 2-3 投資頁面整合
**修改檔案**：`src/app/investment/page.tsx`

在頁面頂部顯示：
- 最新報告連結：「📊 今日裸K報告 (2026-04-12)」→ 點擊在新分頁開啟 HTML
- 或嵌入 `<iframe>` 讓使用者直接在網站內查看

---

## 關鍵檔案

| 動作 | 檔案 |
|------|------|
| 新增 | `src/app/api/investment/export-excel/route.ts` |
| 修改 | `src/app/investment/page.tsx`（新增下載按鈕 + 報告連結） |
| 新增 | `ETF/stock_chart_report.py` |
| 新增 | `.github/workflows/etf_chart_report.yml` |
| DB  | Supabase Storage bucket `investment-reports`（migration 或手動建立） |

## 可重用的現有程式碼

| 用途 | 路徑 |
|------|------|
| Excel 匯出 | `src/components/features/cases/ExportExcelButton.tsx`（參考 exceljs 用法） |
| Holdings 查詢邏輯 | `src/app/api/investment/holdings/route.ts` |
| 量化篩選邏輯 | `src/app/investment/page.tsx` 的 `fetchQuantFilters()` |
| Supabase 直連（bypass RLS） | `ETF/database/sql_storage.py` |
| LINE 推送 | `ETF/daily_ai_report.py` |
| Filter 定義常數 | `src/lib/investment/holdingFilters.ts` |

---

## 執行順序建議（分兩個 openspec change）

### Change 1：「etf-excel-export」（快，2~3 小時）
- API endpoint + Excel 下載按鈕
- 可立即減少手動複製股票代號的痛點

### Change 2：「etf-chart-report-cloud」（較複雜，需要測試）
- `stock_chart_report.py` + GitHub Actions + LINE 通知 + 頁面連結
- 依賴 DB 已有充足的 `stock_prices_daily` / `stock_shareholder_weekly` 資料

---

## 驗證方式

1. **Excel 下載**：
   - 點擊下載按鈕 → 確認瀏覽器下載 `.xlsx`
   - 開啟 Excel 確認兩個 Sheet 格式正確
   - 將 Sheet 1 丟進 `裸K看盤.ipynb` 確認可正常執行

2. **裸K報告**：
   - 手動執行 `uv run python ETF/stock_chart_report.py`
   - 確認 HTML 生成 → 上傳 Storage → LINE 收到通知
   - 在投資頁面點擊連結 → 確認圖表顯示正確

3. **GitHub Actions**：
   - 觀察下一個交易日盤後是否自動觸發
