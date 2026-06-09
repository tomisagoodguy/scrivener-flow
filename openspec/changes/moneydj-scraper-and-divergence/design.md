## Context

### 現有 ETF 爬蟲架構

ETF Pipeline 的持股爬蟲依 `etf_registry.py` 的 `source` 欄位分流：
- `official_api`：各投信官網直接 API（最穩定，每日更新）
- `pocket`：Pocket.tw（公告日才更新，每隔數日才有一筆；00998A、00983A、00401A、00400A 目前使用此來源）

`multi_etf_step.py` 在 `unified_scraper.py` 介面下處理所有非主流程 ETF。當 Pocket.tw 爬取失敗時，目前無 fallback 機制，直接 skip 該 ETF。

### 現有共識分析架構

`OverlapComputeStep` 計算跨 ETF 共識持股（`etf_stock_overlap` 表），只追蹤「同步買進」。`etf-consensus-direction` spec 定義了 `consensus_buy_count/sell_count` 欄位，但沒有「分歧」（同一股票有買也有賣）的概念。

前端 `/investment/consensus` 頁面目前只顯示共同持股排行，無分歧資訊。

## Goals / Non-Goals

**Goals:**

- 新增 `moneydj_scraper.py`，以 subprocess curl 抓 MoneyDJ Basic0007B，解析全部持股，回傳與其他 scraper 相同格式的 DataFrame
- 在 `multi_etf_step.py` 的 pocket fallback 路徑加入 MoneyDJ scraper，Pocket.tw 失敗時自動嘗試
- 新增 `divergence_detect_step.py`（輔助步驟），從當日 `etf_diff_logs` 計算分歧，寫入 `etf_stock_divergence`
- 前端共識頁面新增「分歧」分頁

**Non-Goals:**

- 不替換 official_api ETF 的爬蟲
- 不在 MoneyDJ scraper 實作 Playwright
- 不修改 `etf_stock_overlap` 的欄位結構

## Decisions

### MoneyDJ scraper 使用 subprocess curl 而非 Python requests

**決策**：使用 `subprocess.run(["curl", ...])` 而非 `requests.get()`。

**理由**：Ken61089/etf-tracker 實測指出 curl 對 MoneyDJ 的 TLS 握手最穩定；Python requests 偶有 SSL verify 問題。curl 在所有目標部署環境（Linux CI / Windows self-hosted）皆已安裝。

**替代方案**：requests + verify=False — 有安全疑慮且 requests session 需額外 cookie 處理；Playwright — 過重，MoneyDJ 基本頁無 JS 動態內容。

### MoneyDJ 作為 pocket fallback，而非主要來源

**決策**：`multi_etf_step.py` 保留 Pocket.tw 為優先，MoneyDJ 僅在 Pocket.tw 失敗後嘗試。

**理由**：Pocket.tw 持股資料品質較高（有多欄補充資料），且我們目前以 Pocket.tw 數據為基準。更換主要來源需重新驗證歷史 diff 計算。

### 分歧偵測以「當日 diff_logs」為輸入，獨立步驟

**決策**：新建 `divergence_detect_step.py` 讀取 `ctx.diff_logs`（主流程 00981A）+ 同日其他 ETF 的 `etf_diff_logs` DB 記錄，而非在 `OverlapComputeStep` 內部擴充。

**理由**：OverlapComputeStep 目前邏輯複雜，新增分歧計算會增加耦合；獨立步驟更易測試，失敗也不影響 overlap 計算。

### 分歧存入新表 `etf_stock_divergence`

**決策**：建立獨立的 `etf_stock_divergence` 表，而非擴充 `etf_stock_overlap`。

**理由**：`etf_stock_overlap` 以「股票 × ETF 對」為粒度，分歧資料以「股票 × 日期」為粒度，兩者結構不同；新表更清晰，前端查詢更簡單。

表結構：
```sql
CREATE TABLE etf_stock_divergence (
    id           bigserial PRIMARY KEY,
    data_date    date        NOT NULL,
    stock_code   text        NOT NULL,
    stock_name   text,
    buy_etfs     jsonb       NOT NULL DEFAULT '[]',  -- [{"etfid": "00981A", "diff_shares": 5000}]
    sell_etfs    jsonb       NOT NULL DEFAULT '[]',  -- [{"etfid": "00991A", "diff_shares": -3000}]
    buy_count    int         NOT NULL DEFAULT 0,
    sell_count   int         NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (data_date, stock_code)
);
```

### 前端分歧頁面整合進現有 consensus 頁面

**決策**：在 `src/app/investment/consensus/page.tsx` 新增分頁（tab），而非建立新路由。

**理由**：分歧與共識是對立的兩個面向，放在同一頁面更直覺，避免使用者找不到入口。

## Risks / Trade-offs

- **MoneyDJ HTML 結構改版風險**：`col05/col06/col07` CSS class 和 `sdate3` 是 DOM 結構依賴，MoneyDJ 改版會造成 parser 靜默失敗（回傳空資料）。→ 解法：解析成功後驗證行數 > 0，否則 log error 並 return None（不寫入 DB）。
- **curl 在 CI 環境的可用性**：GitHub Actions ubuntu-latest 預設安裝 curl，self-hosted Windows runner 需確認。→ 解法：scraper 執行前 `shutil.which("curl")` 偵測，找不到則 raise 明確錯誤。
- **分歧偵測僅反映當日快照**：`etf_diff_logs` 按公告日更新頻率不同，部分 ETF 可能多日才有一筆，分歧比較窗口需對齊。→ 解法：以相同 `data_date` 的 diff_logs 為比較基準（而非日曆日），確保橫向對齊。
- **`etf_stock_divergence` 寫入量**：每日最多 N 筆（跨 ETF 有分歧的股票數），通常 < 50 筆，無容量壓力。

## Migration Plan

1. 執行新 SQL migration 建立 `etf_stock_divergence` 表（冪等 `CREATE TABLE IF NOT EXISTS`）
2. 部署新 scraper 和 step（無破壞性，fallback 路徑只在 Pocket 失敗時啟用）
3. 確認至少一次 pipeline 成功後，再開啟前端分歧分頁的顯示
4. Rollback：移除 `divergence_detect_step.py` 的 orchestrator 引用即可；DB 表保留不刪
