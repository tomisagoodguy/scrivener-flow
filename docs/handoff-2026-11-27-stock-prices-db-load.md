# 交接：`stock_prices_daily` 查詢把共用資料庫塞爆

- 日期：2026-11-27
- 來源：exampleSite（破關地圖／公帳 LINE bot）排查 bot 失敗時發現
- Supabase 專案：`zvomerdcsxvuymnpuvxk`（**與 exampleSite 的破關地圖、公帳共用同一台免費資料庫**）

## 為什麼要處理

1. **拖垮同一台資料庫的其他服務**：scrivener-flow 的股價查詢尖峰時把 CPU／連線吃滿，連 22 筆的公帳表都撞到 anon 的 3 秒 `statement_timeout`（57014），LINE bot 回「沒有成功」。過去 24 小時每小時 1～170 次逾時，絕大多數是 `stock_prices_daily`。
2. **容量快滿**：資料庫 **487 MB／免費上限 500 MB**。據了解超過會被設成唯讀（以 Supabase 官方說明為準），屆時每日匯入與公帳寫入都會失敗。**所以這次不能靠加索引解決。**
3. **疑似計算錯誤**（見下方「附帶 bug」）。

## 診斷結果

### 最耗時的查詢（`pg_stat_statements`，2026-01-06 起累計）

| 排名 | 查詢樣子 | 次數 | 合計 | 平均 | 來源 |
| --- | --- | --- | --- | --- | --- |
| 1 | `select stock_code, close, amount, it_buy … stock_code = ANY($1) AND data_date >= $2 ORDER BY data_date DESC LIMIT` | 21,340 | 5.2 小時 | 877 ms | `src/lib/investment/equityPageData.ts` `fetchPriceIndicators` |
| 2 | `select stock_code, data_date, close, it_buy … stock_code = ANY($1) ORDER BY data_date DESC LIMIT` | 29,589 | 4.9 小時 | 597 ms | `src/lib/investment/quantFilters.ts` `fetchQuantFilters`（`recentPriceData`）、`src/app/actions/ai/generateInvestmentPromptAction.ts` |
| — | `… margin_ratio …`、`… close … data_date >= $2 ASC` 等同型查詢 | 數千～3 萬 | 各約 0.1～0.3 小時 | 數十～700 ms | 同上類寫法 |

各條的 max 都卡在約 3,000 ms，也就是撞到 anon 3 秒上限被取消的那批。

### 主因：一次同時丟出幾十條查詢

`fetchPriceIndicators`（`equityPageData.ts:69-91`）：

```ts
const BATCH = 20;
batches.map(batch => supabase.from('stock_prices_daily')
  .select('stock_code, close, amount, it_buy')
  .in('stock_code', batch).gte('data_date', cutoffStr)   // 310 天
  .order('data_date', { ascending: false })
  .limit(batch.length * 220));
await Promise.all(...);   // 全部同時送出
```

- `allCodes`（`equityPageData.ts:352-355`）＝大戶增加 ∪ 散戶減少，可能接近全市場（最新一天有 1,933 檔）。每 20 檔一條，一次最多快 100 條**同時**送出，資料庫 `max_connections` 只有 60。log 曾在 1.5 秒內出現 9 條同型逾時，跟這個情況吻合。
- **每條查詢都要讀很多頁**：資料按日期寫入，每天 1,933 檔混在一起，同一檔散在各頁。實測 20 檔、310 天＝3,315 筆，要讀 **1,232 個 heap page**，耗時 160 ms～1,068 ms（看主機當下忙不忙）。
- **快取命中率低**：`fetchRankingData`（`equityPageData.ts:380-387`）的 `unstable_cache` key 含 `sort/dir/tier/weeks`，組合上百種。但股價指標跟排序無關，每換一個沒看過的排序組合，就整批重打一次上面那幾十條。
- `fetchQuantFiltersBatched`（`quantFilters.ts:14-20`）也是同一種模式：每 60 檔一批、`Promise.all` 並發，每批 3 條查詢。呼叫端：`src/app/investment/page.tsx:226`、`src/app/api/investment/holdings/route.ts:62`、`src/app/api/investment/export-excel/route.ts:21`。

### 不可行的方向（已實測）

| 方向 | 結果 |
| --- | --- |
| 加索引、`CLUSTER` 重排 | 剩 13 MB 空間，`CLUSTER` 要暫時複製整張表（68 MB），**不能做** |
| 寫 RPC，頁面打開時一條 SQL 算完全市場 | window function 算全市場 200／20 日高點、5 日投信：Index Scan 版 **11.2 秒**、強制 Seq Scan＋`work_mem=32MB` 仍 **8.3 秒**。anon 上限 3 秒，**不可行**。這台主機 CPU 很弱，光排序 32 萬列就要好幾秒 |

## 建議做法

### 1. 每日匯入時預先算好指標（主修）

- 新增一張小表，例如 `stock_price_indicators(stock_code pk, data_date, is_200d_high, is_20d_high, it_buy_5d, amount, …)`，約 2,000 列、不到 1 MB。
- 在寫入 `stock_prices_daily` 的每日匯入流程最後計算並 upsert。可以在 Python 端用剛抓到的資料算，或用 service role 呼叫 SQL function。後者要在 function 內 `set local statement_timeout` 放寬，前面實測要 8～11 秒。
- `fetchPriceIndicators` 改成讀這張表（`.in('stock_code', …)` 一檔一列，或直接全讀 2,000 列），幾十條並發變成一兩條小查詢。
- `quantFilters.ts` 的 `momentum_60d`、`it_buy_5d` 同理，可以放進同一張表。
- 判斷邏輯（`prices200.length >= 60`、`latest.close >= max200` 等）要跟現在 `equityPageData.ts:107-122` 一致，或是刻意修正（見下方 bug），並寫在 PR 說明。

### 2. 股價指標獨立快取（小改、先做也有效）

- 若第 1 項還沒做，至少把 `fetchPriceIndicators` 包一層 `unstable_cache`，key 用「資料日期＋codes 的雜湊」或乾脆全市場一份，不要跟 `sort/dir/tier/weeks` 綁在一起。
- 依全域規則，快取內查詢失敗要 **throw**，不要回空，否則失敗結果會被快取一小時。

### 3. 限制並發（過渡）

- 第 1 項完成前，`Promise.all(batches.map(...))` 改成同時最多 3～4 條（簡單的 for 迴圈分組即可，不用引入套件），避免一次占滿 60 個連線。

### 4. 容量（另開任務）

- 目前最大的表：`stock_prices_daily` 68 MB、`stock_shareholder_weekly` 56 MB、`etf_holdings_snapshot` 54 MB、`sector_strength_stocks` 49 MB、`stock_broker_transactions` 32 MB、`strategy_signals` 28 MB。
- 建議先決定各表保留天數（例如舊的 ETF 持股快照只留最近 N 天）。**刪資料前要先跟使用者確認**。

## 附帶 bug（推論，尚未驗證）

`fetchPriceIndicators` 的 `.limit(batch.length * 220)`＝4,400，但 PostgREST 預設一次最多回 1,000 筆（`quantFilters.ts:15` 的註解也寫了這個上限）。

- 若上限確實是 1,000：每批 20 檔只拿得到最新約 1,000 筆，平均每檔約 50 個交易日。`prices200.length >= 60` 永遠不成立，**`is_200d_high` 永遠是 false**。各檔拿到的天數也會不平均。
- 驗證方式：到 Supabase Dashboard → API Settings 看 Max rows；或在本機印出某批 `data.length`，看是否剛好 1,000。
- 第 1 項改成預先計算後，這個問題會一起消失。

## 驗收

- [ ] 籌碼排行頁一次載入，對 `stock_prices_daily` 的查詢降到個位數條（Supabase Logs 或 `pg_stat_statements` 的 `calls` 增量）
- [ ] `pg_stat_statements` 前兩名的累計時間不再增加，或被新的小查詢取代
- [ ] Logs 裡 `canceling statement due to statement timeout` 每小時降到接近 0：`select toStartOfHour(timestamp) h, count(*) from logs where source='postgres_logs' and event_message like '%statement timeout%' group by h order by h`
- [ ] 抽幾檔確認 `is_200d_high`、`is_20d_high`、`it_buy_5d` 跟用完整資料手算的結果一致
- [ ] 資料庫大小沒有明顯增加（`select pg_size_pretty(pg_database_size(current_database()))`）

## 重現用的 SQL

```sql
-- 最耗時查詢
select calls, round(total_exec_time/1000) total_s, round(mean_exec_time) mean_ms, left(query, 300)
from extensions.pg_stat_statements
where query ilike '%stock_prices_daily%'
order by total_exec_time desc limit 10;

-- 單批 20 檔的讀頁數
explain (analyze, buffers)
select stock_code, close, amount, it_buy from stock_prices_daily
where stock_code = any(array['1101','1102','1103','1104','1108','1109','1110','1201','1203','1210',
                             '1213','1215','1216','1217','1218','1219','1220','1225','1227','1229'])
  and data_date >= current_date - 310
order by data_date desc limit 4400;
```

## exampleSite 端已做的事

- 公帳 LINE bot（`supabase/functions/line-webhook`，v19）的唯讀查詢遇到 57014 會等 1.5 秒重試一次，只能撐過短暫尖峰，治不了本。
