## MODIFIED Requirements

### Requirement: LINE 每日報告附上族群摘要
每日 LINE 報告 SHALL 在現有 ETF 異動訊息之後，附加依品質條件篩選的強勢族群 TOP 5 與本週強勢族群 TOP 5。

品質篩選條件（同時滿足）：
- `ret_1d > 0`
- `ret_5d > 0`
- `breadth >= 0.40`

排序方式：依 `strength_score` 降序，取前 5 名。

#### Scenario: 正常發送（品質篩選）
- **WHEN** `build_sector_summary()` 執行
- **THEN** SQL 查詢 SHALL 加入 `ret_1d > 0 AND ret_5d > 0 AND breadth >= 0.40` 條件
- **THEN** 結果 SHALL 依 `strength_score DESC` 排序
- **THEN** 取前 5 名作為「今日強勢族群」
- **THEN** 本週強勢族群 SHALL 同樣取符合條件者依 `ret_5d DESC` 前 5 名

#### Scenario: 品質條件無符合族群
- **WHEN** 當日無任何族群同時滿足三項品質條件
- **THEN** `build_sector_summary()` SHALL 回傳空字串，LINE 報告跳過族群摘要區塊

#### Scenario: 族群資料不存在時降級
- **WHEN** `sector_strength` 當日無資料（Pipeline 步驟失敗或 `breadth` 欄位 NULL）
- **THEN** LINE 報告跳過族群摘要區塊，不顯示錯誤訊息

##### Example: SQL 條件與排序
| 條件 | 值 |
|------|-----|
| WHERE | `ret_1d > 0 AND ret_5d > 0 AND breadth >= 0.40` |
| ORDER BY | `strength_score DESC NULLS LAST` |
| LIMIT | 10（取前 5 名展示，剩餘 5 名供策略命中查詢用） |
