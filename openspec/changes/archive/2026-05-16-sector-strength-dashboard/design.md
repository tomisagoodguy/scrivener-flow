## Context

目前 ETF Pipeline 追蹤 11 支主動 ETF 的持股異動，LINE 每日報告聚焦在「ETF 加減碼哪支股票」。缺乏市場層面的族群資金流向觀察——使用者需要手動去外部網站（如 aistockmap.com）查詢今日哪個族群在動。

資料來源：FinLab VIP `security_industry_themes`（每日 17:00 更新），`price:收盤價`（每日盤後）。

## Goals / Non-Goals

**Goals:**
- 每日自動計算全市場族群漲幅（日/週/月），存入 DB
- LINE 每日報告附上今日/本週強勢族群 TOP 5
- Web 頁面顯示族群強弱排行，點開族群看成分股當日表現

**Non-Goals:**
- 不做個人化策略篩選（純市場觀察工具）
- 不做即時盤中更新（盤後一次計算即可）
- 不做買賣建議

## Decisions

### 1. DB Schema：存族群快照而非即時計算

**選擇**：每日 Pipeline 計算後存入 `sector_strength` table，Web 直接讀 DB。

**放棄**：Web 頁面即時呼叫 FinLab API 計算。

**理由**：FinLab 每日配額 5000MB，即時計算會消耗配額且前端回應慢（price 歷史資料大）。存 DB 後 Web 讀取毫秒級。

---

### 2. 族群漲幅計算方式：同族群內所有股票平均漲幅

```
ret_Nd = close.pct_change(N).iloc[-1]
sector_ret = df.groupby('category')[ret_Nd].mean()
```

過濾條件：族群內家數 >= 5（避免單一股票干擾平均值）。

---

### 3. Pipeline 步驟定位：輔助步驟（失敗不中斷）

`SectorStrengthStep` 加在 `SaveSnapshotStep` 之後、`NotifyStep` 之前。屬於輔助步驟，`except` 不 `raise`，失敗只 log，不影響主流程與 LINE 通知。

---

### 4. Web 成分股展示：Server Action 按需查詢

點開族群時，由 Server Action 從 DB 的 `sector_strength_stocks` 子表查詢該族群當日成分股與個股漲幅，不預載所有成分股（減少首屏資料量）。

---

### 5. LINE 通知格式：純文字附加在現有報告末尾

```
📊 今日強勢族群
1. 半導體:記憶體IC  +3.2%
2. 被動元件:電容器  +2.8%
...

📈 本週強勢族群
1. 半導體:記憶體IC  +17.5%
...
```

不用 Flex Message（保持簡潔，不增加 LINE API 複雜度）。

## Risks / Trade-offs

- **FinLab 配額**：`security_industry_themes` 每次取用約數 MB，每日一次可接受。→ 在 `SectorStrengthStep` 內取，不重複呼叫。
- **category 欄位是字串陣列**：需 `eval()` 轉換，若格式異常會 crash。→ 加 `try/except` 保護單筆解析。
- **一股多產業**：同一股票可能同時出現在多個族群，屬正常設計（`explode` 展開），不視為 bug。

## Migration Plan

1. 新增 DB migration（`sector_strength` + `sector_strength_stocks` 兩張表）
2. 部署 `SectorStrengthStep` 到 Pipeline
3. 手動跑一次補足今日資料
4. 部署 Web 頁面
5. 更新 LINE 報告
