## Context

`caseService.syncSystemTodos` 現在為每個案件生成 7 個系統任務（3 個約定時間 + 4 個稅務限繳）。任務以 `source_key` 去重，upsert 時若 key 已存在則更新，不存在則新增。

稅務申報準備提醒需要在稅務限繳日前就提醒代書準備文件。觸發日期基準：
- 土增稅、契稅 → `seal_date`（用印日）前 3 天
- 地價稅、房屋稅 → `tax_payment_date`（完稅日）前 3 天

## Goals / Non-Goals

**Goals:**
- 在現有 `syncSystemTodos` 新增 4 個申報準備任務
- 複用現有 `addSystemTodo` helper，保持一致的去重邏輯
- 零 DB schema 變更

**Non-Goals:**
- UI 上區分「申報準備」vs「限繳」的視覺標籤（現有待辦清單直接顯示即可）
- 提前天數可設定化（固定 3 天，未來有需求再改）

## Decisions

**日期偏移計算在 Service 層做**：直接在 `syncSystemTodos` 內 `new Date(dateVal)` 後 `setDate(d.getDate() - 3)` 得到提前 3 天的日期，不新增工具函式。理由：邏輯簡單，不值得抽象。

**source_key 命名規則**：沿用現有模式加 `_prep` 後綴（`land_val_tax_prep`、`deed_tax_prep`、`land_tax_prep`、`house_tax_prep`），確保與限繳 key 不衝突。

## Risks / Trade-offs

- `seal_date` 或 `tax_payment_date` 未設定時，對應的 prep 任務不會產生（`addSystemTodo` 已有 null guard，行為一致）
- 若用印日距今已不足 3 天，任務 `due_date` 會是過去時間，顯示為逾期（可接受，與現有限繳任務行為一致）
