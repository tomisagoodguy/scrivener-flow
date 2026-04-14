## Context

**現況**：ETF metadata（code、name、manager）在 TypeScript 與 Python 各自維護，且兩邊資料已出現嚴重不一致。

**嚴重資料不一致**（Python `ETF_META` vs TypeScript `etfRegistry.ts`）：

| Code | TS name | Python name | TS manager | Python manager |
|------|---------|-------------|------------|----------------|
| 00982A | 主動群益台灣強棒 | **中信優選成長** | 群益投信 | **中國信託投信** |
| 00984A | 主動安聯台灣高息 | **群益主動優選** | 安聯投信 | **群益投信** |
| 00985A | 主動野村台灣50  | **元大主動選股** | 野村投信 | **元大投信** |
| 00987A | 主動台新優勢成長 | **凱基主動精選** | 台新投信 | **凱基投信** |
| 00992A | 主動群益科技創新 | **統一主動選股** | 群益投信 | **統一投信** |
| 00993A | 主動安聯台灣   | **永豐主動選股** | 安聯投信 | **永豐投信** |
| 00994A | 主動第一金台股優 | **新光主動選股** | 第一金投信 | **新光投信** |
| 00995A | 主動中信台灣卓越 | **台新主動選股** | 中國信託投信 | **台新投信** |

TS registry 較新且由前端實際使用展示，以 **TS 為準**，Python 端全面對齊。

**另一個不一致**：`etfRegistry.ts` 的 `dataSource` 標記為 `'moneydj'`，但 pipeline 實際使用 `pocket_scraper.py`（Pocket.tw）；`moneydj_scraper.py` 存在但在 pipeline 中從未被呼叫。

---

## Goals / Non-Goals

**Goals:**
- 建立 `ETF/config/etf_registry.py`，作為 Python 端唯一 ETF 清單
- 修正所有 Python ETF metadata（以 TS 為準）
- `multi_etf_step.py`、`daily_ai_report.py`、`prompt_builder.py` 改為從 registry import，移除本地 hardcode
- 修正 `etfRegistry.ts` 的 `dataSource` 欄位（`'moneydj'` → `'pocket'`）
- 刪除 `moneydj_scraper.py`（從未被 pipeline 使用，已造成混淆）
- 新增 ETF 後只需改兩個檔案（`etfRegistry.ts` + `etf_registry.py`）

**Non-Goals:**
- 不做 Python/TypeScript 資料共享（JSON/YAML 中間層）：維護成本高，兩邊語言環境差異大
- 不改 Pocket.tw scraper 邏輯，不切換爬蟲來源
- 不改 DB schema 或前端展示邏輯
- 不處理 `ScrapeStep` / `00981A` 主流程（已足夠獨立）

---

## Decisions

### 決策 1：Python registry 為獨立檔案，不共用 JSON

**選項 A（採用）**：`ETF/config/etf_registry.py` — 純 Python dataclass，直接 import  
**選項 B（放棄）**：共用 `ETF/config/etf_registry.json`，TS 和 Python 各自解析

**理由**：選項 B 雖能「單一真相」，但需要額外的 JSON 解析器、TS 的 `fs.readFileSync`（破壞 Server Component 限制）或 build-time import，增加複雜度。兩個語言環境本就獨立部署（Vercel vs GitHub Actions），維護兩份檔案但保持結構一致，是最低成本的選擇。當 ETF 數量相對穩定（台灣主動型 ETF 市場規模有限），同步成本可接受。

### 決策 2：以 TypeScript registry 為 single source of truth

Python ETF_META 已有 8/11 筆 name/manager 錯誤。TS 版本由前端實際渲染（使用者可見），更新頻率較高、驗證較嚴。  
**實作**：Python `etf_registry.py` 的初始值直接從 TS 手工對齊，加上 docstring 說明需與 TS 保持一致。

### 決策 3：`dataSource` 改為 `'pocket'`，刪除 moneydj_scraper

`moneydj_scraper.py` 從未在 pipeline 任何 step 被 import 或呼叫，是死碼。保留只會持續誤導。  
刪除前確認無其他 import。`etfRegistry.ts` 的型別聯合改為 `'fhtrust' | 'pocket'`。

### 決策 4：AI 日報動態讀取全部 ETF

`daily_ai_report.py` 目前只處理 3 支，原因是當初 hardcode 寫入。  
改為從 `etf_registry.py` 讀取全部 non-primary ETF（即排除 `dataSource == 'fhtrust'` 的 00981A，它走獨立主流程），確保新增 ETF 自動納入。

---

## Risks / Trade-offs

**[Risk] Python 與 TS registry 未來再次出現 drift**  
→ Mitigation：在 `etf_registry.py` 頂部加上 docstring：「此檔案必須與 src/lib/investment/etfRegistry.ts 保持一致，新增 ETF 時兩邊同步修改」；未來可考慮 CI 校驗腳本

**[Risk] 刪除 moneydj_scraper.py 後才發現有 test 或 import**  
→ Mitigation：執行前先 `grep -r moneydj_scraper ETF/` 確認無引用

**[Risk] AI 日報從 3 支改為 11 支，Gemini Prompt 長度可能超限或品質下降**  
→ Mitigation：`prompt_builder.py` 的每日報告 prompt 本就以 ETF code 為 key 分段，逐支生成；實際 token 增加有限，可觀察首次執行結果再調整

---

## Migration Plan

1. 新增 `ETF/config/__init__.py`（空）+ `ETF/config/etf_registry.py`
2. 修改 `ETF/pipeline/steps/multi_etf_step.py`：移除 `SECONDARY_ETF_CODES`/`ETF_META`，改 import
3. 修改 `ETF/daily_ai_report.py`：移除 `ETF_CODES` hardcode，改 import
4. 修改 `ETF/ai_report/prompt_builder.py`：移除 `ETF_NAME_MAP` hardcode，改 import
5. 修改 `src/lib/investment/etfRegistry.ts`：`dataSource` 型別 + 值更新
6. 刪除 `ETF/scrapers/moneydj_scraper.py`（grep 確認無引用後）
7. 執行 `uv run ruff check --fix && uv run ruff format`
8. 執行 `uv run pytest ETF/` 確認無測試失敗

**Rollback**：所有修改均為 in-place 改寫，git revert 即可。無 DB 變更、無 API 變更。
