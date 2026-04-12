## Why

本地 Jupyter notebook（`EOCS/裸K看盤.ipynb`）已建立一套完整的技術分析看盤工具，整合 K 線、均線、訊號條、成交量、融資率、月營收 YOY/MOM、集保籌碼大戶 vs 散戶等六層面板，並輸出合併 HTML。問題在於：需要開電腦、跑 Jupyter、管 Excel 選股清單，無法隨時隨地查看，且結果不能跨裝置共享。

目標：把裸K看盤搬上 Web，讓使用者在瀏覽器直接互動查圖，選股清單改存 Supabase，後端定時（或按需）產生快照資料存入 DB，前端用 Lightweight Charts 重繪六面板。

## What Changes

- **新增**：`/investment/watch-list` 頁面 — 自選股清單管理（新增/刪除/分組）
- **新增**：`/investment/bare-k/[code]` 頁面 — 單股六面板裸K互動圖
- **新增**：`/investment/bare-k` 總覽頁 — 所有自選股縮圖格，點擊進入詳情
- **新增**：Python 後端 `ETF/pipeline/steps/sync_bare_k_step.py` — 同步裸K面板所需指標到 DB
- **新增**：DB 表 `watch_list`（使用者選股清單）與 `bare_k_snapshots`（每日快照）
- **新增**：API Route `GET /api/investment/bare-k/[code]` — 回傳指定股票的快照資料
- **新增**：`POST /api/investment/watch-list` — 管理自選股（CRUD）
- **修改**：`ETF/main.py` — 在 pipeline 末端加入 `SyncBareKStep`（只同步 watch_list 中的股票）
- **修改**：`ETF/pipeline/context.py` — 新增 `watch_list_stocks` 欄位

## Capabilities

### New Capabilities

- `bare-k-chart`: 六面板裸K互動圖元件（K 線 + 均線 + 260 高、訊號條、成交量、融資率、月營收 YOY/MOM、集保籌碼）
- `watch-list-management`: 自選股清單管理（CRUD、分組標籤、多策略標記），儲存至 Supabase，支援多使用者 RLS 隔離
- `bare-k-sync`: Python 後端定時同步——從 FinLab 抓取 watch_list 成員的 OHLCV、均線、訊號條件、融資率、月營收、集保籌碼，存入 `bare_k_snapshots` 表

### Modified Capabilities

- `investment-data-pipeline`: pipeline 新增 `SyncBareKStep`，觸發條件與現有 `SyncOHLCVStep` 共用 FinLab session

## Impact

**前端新增**
- `src/app/investment/bare-k/page.tsx` — 總覽格
- `src/app/investment/bare-k/[code]/page.tsx` — 單股詳情
- `src/app/investment/watch-list/page.tsx` — 清單管理
- `src/components/features/investment/BareKChart.tsx` — Lightweight Charts 六面板
- `src/app/api/investment/bare-k/[code]/route.ts`
- `src/app/api/investment/watch-list/route.ts`

**Python 後端新增**
- `ETF/pipeline/steps/sync_bare_k_step.py`
- `ETF/services/finlab/bare_k_service.py`（抽取 notebook 指標計算邏輯）

**DB Schema 新增**（`supabase/migrations/`）
- `watch_list(id, user_id, stock_id, name, strategies[], created_at)` — RLS user_id
- `bare_k_snapshots(id, stock_id, date, ohlcv_json, ma_json, signals_json, margin_json, revenue_json, inv_json, created_at)` — 無 RLS，所有使用者共用快照資料

**依賴**：Lightweight Charts（已安裝）、Supabase（已配置）、FinLab（Python 已配置）
