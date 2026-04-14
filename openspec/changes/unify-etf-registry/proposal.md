## Why

Python ETF pipeline 的 ETF 清單分散在 4 個檔案中（`multi_etf_step.py`、`daily_ai_report.py`、`prompt_builder.py`、`context.py`），與 TypeScript `etfRegistry.ts` 各自維護，導致新增第 12 支 ETF 需改 4 個地方，且現有 8 支 ETF 的 AI 日報完全缺漏（只有 3/11 支有 AI 分析）。

## What Changes

- **新增** `ETF/config/etf_registry.py`：Python 端唯一 ETF registry，結構對應 `etfRegistry.ts`，包含 code、name、manager、dataSource 等欄位
- **修改** `ETF/pipeline/steps/multi_etf_step.py`：移除本地 `SECONDARY_ETF_CODES` / `ETF_META`，改從 `etf_registry.py` 動態讀取
- **修改** `ETF/daily_ai_report.py`：移除 hardcode `ETF_CODES = ["00981A", "00980A", "00991A"]`，改為從 registry 動態迭代全部 ETF
- **修改** `ETF/ai_report/prompt_builder.py`：移除 hardcode `ETF_NAME_MAP`（僅 3 支），改為從 registry 自動生成
- **修改** `src/lib/investment/etfRegistry.ts`：修正 `dataSource` 欄位值，'moneydj' 改為 'pocket'（對應實際使用的 pocket_scraper）
- **移除** 孤立未使用的 `ETF/scrapers/moneydj_scraper.py`（在 pipeline 中從未被呼叫，引起混淆）

## Capabilities

### New Capabilities

- `etf-python-registry`：Python 端中央 ETF 清單，所有步驟從此單一來源讀取 ETF metadata，新增 ETF 只需改此一檔

### Modified Capabilities

- `etf-ai-report`：AI 日報覆蓋範圍從 3 支擴大到全部 11 支（registry 驅動），`ETF_NAME_MAP` 自動與 registry 同步

## Impact

**Python 檔案**：
- `ETF/config/etf_registry.py`（新增）
- `ETF/pipeline/steps/multi_etf_step.py`（修改）
- `ETF/daily_ai_report.py`（修改）
- `ETF/ai_report/prompt_builder.py`（修改）
- `ETF/scrapers/moneydj_scraper.py`（刪除）

**TypeScript 檔案**：
- `src/lib/investment/etfRegistry.ts`（修正 dataSource 標籤）

**無 DB Schema 變更，無 API 變更，無前端行為變更。**

執行影響：每日 CI workflow（`.github/workflows/etf_daily.yml`）不需改動，pipeline 步驟順序不變，只是 ETF 清單的來源從硬編碼改為動態讀取。
