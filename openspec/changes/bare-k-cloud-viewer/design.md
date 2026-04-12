## Context

**現況**：`EOCS/裸K看盤.ipynb` 是一個本地 Jupyter notebook，依賴 FinLab API 動態抓取全市場資料、即時計算六個面板的指標後，用 Plotly 輸出 HTML/PDF。選股清單存在 `EOCS/select_stock.xlsx`，每次執行需手動維護。

**問題**：
1. 必須在有 Python 環境的電腦執行，無法手機查看
2. Excel 選股清單無法多人共享，也不在版本控制內
3. 每次執行才能看到最新資料，不支援歷史回溯

**約束**：
- 前端已有 Lightweight Charts（`ETF/pipeline/steps` 已整合）；禁止引入 Plotly.js 增加 bundle size
- FinLab 資料只能在後端 Python 環境存取（需 API Token）
- 每日 ETF pipeline 在 UTC 14:00 執行；裸K資料同步搭便車
- DB 快照方案需考慮每支股票每日約 240 row 的 OHLCV + 5 個衍生指標 JSON

## Goals / Non-Goals

**Goals:**
- 使用者可在 Web App 瀏覽自選股的六面板裸K圖，資料每日更新
- 自選股清單存 Supabase，支援 RLS（每人獨立清單），可標記多策略 tag
- Python pipeline 每日自動同步 watch_list 股票的快照指標
- 前端六面板與 notebook 版本在語義上等價（相同的訊號條件邏輯、相同的顏色規範）

**Non-Goals:**
- 即時盤中資料（FinLab 資料本身有 T+1 延遲，維持此限制）
- 自定義指標或面板順序（初版固定六面板）
- 歷史快照瀏覽（初版只顯示最新一天）
- PDF 匯出（已有 HTML 輸出，雲端版不重複）

## Decisions

### 決策 1：前端圖表庫 — Lightweight Charts（非 Plotly）

**選擇**：Lightweight Charts，與現有 `/investment/[etf]/page.tsx` 一致。

**替代方案**：直接在 iframe 嵌入 Plotly 產出的 HTML。
**否決理由**：iframe HTML 需額外儲存（Storage 費用）、互動介面不統一、bundle 若引入 Plotly.js 增加 ~3MB。

**代價**：需把 notebook 的 Plotly trace 邏輯翻譯成 Lightweight Charts API（工作量約 2–3 天）。

---

### 決策 2：資料模型 — 預計算快照存 DB（非即時計算）

**選擇**：Python pipeline 計算後以 JSONB 存入 `bare_k_snapshots`，前端只做讀取。

**結構**：
```sql
bare_k_snapshots (
  stock_id    TEXT,
  date        DATE,        -- 快照日期（最新交易日）
  ohlcv       JSONB,       -- [{date, o, h, l, c, v}, ...]  最近 240 筆
  mas         JSONB,       -- {ma5: [...], ma20: [...], ma60: [...], ma120: [...], h260: [...]}
  signals     JSONB,       -- [{date, hit260, low_vol, margin_ok, rev_9max, trust_ok}, ...]
  margin      JSONB,       -- [{date, rate}, ...]
  revenue     JSONB,       -- [{date, yoy, mom}, ...]
  inv_chips   JSONB,       -- [{date, big_chg, small_chg, pr_rank}, ...]
  summary     JSONB,       -- {last_price, dist_260, last_signals, ...} 供總覽格顯示
  PRIMARY KEY (stock_id, date)
)
```

**替代方案**：Python 每次 API 請求時即時計算。
**否決理由**：FinLab 資料下載每次 > 10 秒；用戶端等不起，且 FinLab Token 不能暴露前端。

---

### 決策 3：Watch List — 存 Supabase（RLS 隔離）

**選擇**：`watch_list` 表，每個使用者各自的選股清單。

```sql
watch_list (
  id          UUID DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users,
  stock_id    TEXT NOT NULL,
  name        TEXT,           -- 公司簡稱（存入避免每次查詢）
  strategies  TEXT[],         -- 策略標籤，e.g. ['創260高', '低波動']
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, stock_id)
)
```

**RLS Policy**：`USING (auth.uid() = user_id)`，只看自己的清單。

**注意**：Pipeline 需要聚合所有使用者的 `watch_list.stock_id` 做 union，使用 service role 繞過 RLS。

---

### 決策 4：Pipeline 整合 — 加在 CleanupStep 之前

新增 `SyncBareKStep`，插入 orchestrator 最後位置。讀取 `watch_list` 全部 stock_id（union all users）→ 呼叫 `BareKService.compute_snapshot()` → 批次 upsert `bare_k_snapshots`。

**選擇此位置理由**：在 `SyncOHLCVStep` 之後可重用已快取的 FinLab session，避免重複建立連線。

---

### 決策 5：前端路由結構

```
/investment/bare-k            → 總覽頁（所有 watch_list 的 summary 格）
/investment/bare-k/[code]     → 單股六面板詳情
/investment/watch-list        → 自選股管理（CRUD + 策略 tag）
```

API Routes（讀）：
- `GET /api/investment/bare-k/[code]` → 最新快照 JSONB
- `GET /api/investment/bare-k` → 所有我的 watch_list + summary

Server Actions（寫）：
- `addWatchStock(stockId, strategies)` → INSERT watch_list
- `removeWatchStock(stockId)` → DELETE watch_list
- `updateWatchStrategies(stockId, strategies)` → UPDATE watch_list

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| **集保籌碼資料（inv）計算慢**：notebook 的 pivot_table 操作需全市場資料 | `BareKService` 只取 watch_list 股票的集保資料（pandas filter 後再 pivot），避免全市場 |
| **watch_list 股票過多導致 pipeline 超時**：每日 ETF pipeline 有時間限制 | 設定 `MAX_BARE_K_STOCKS = 50`，超過時按 created_at 取最新 50 支並記 warning |
| **Lightweight Charts 無原生 signal bar 面板**：notebook 用 Plotly `go.Scatter` 搭 category y-axis 實作 | 改用客製化 HTML legend 疊在 canvas 上，或用第 2 列 ISeriesPrimitive 插件；初版用疊加 marker 方案 |
| **首次部署 bare_k_snapshots 為空**：使用者看到空白頁 | 提供 `/api/investment/bare-k/refresh` 觸發 on-demand 補算（僅限 service role） |
| **JSONB 欄位過大**：240 天 × 6 欄位 per 股 | 單股快照估算 < 50KB；50 支股票共 < 2.5MB，Supabase 可接受 |

## Migration Plan

1. 執行 Supabase migration 建立 `watch_list`、`bare_k_snapshots`
2. 部署 Python `SyncBareKStep`（watch_list 為空時 step 直接跳過）
3. 部署前端路由與元件
4. 使用者透過 `/investment/watch-list` 加入第一批股票
5. 等 UTC 14:00 pipeline 自動跑；或手動觸發補算 API

**Rollback**：前端路由可直接刪除；DB 表可 DROP（資料無法恢復但對其他功能無影響）；pipeline step 可從 orchestrator 移除。

## Open Questions

1. **訊號條（row 2）的 Web 實作**：用 ISeriesPrimitive？或純 CSS overlay？— 需 UI 確認
2. **on-demand 補算 API 是否需要 UI 觸發按鈕**？或只給 admin 用？— 初版先做 API，UI 留空
3. **watch_list 策略 tag 是預設清單還是自由輸入**？— 初版預設與 notebook 一致的 5 個條件
