## ADDED Requirements

### Requirement: 六面板裸K圖渲染

系統 SHALL 在 `/investment/bare-k/[code]` 頁面渲染一個六面板圖表，面板從上到下依序為：
1. K 線 + MA5/20/60/120 均線 + 260 日高（虛線）
2. 訊號條（5 個條件的每日亮燈狀態）
3. 成交量（紅/綠柱）+ 量 MA20
4. 融資維持率（折線）+ 健康區間填色
5. 月營收 YOY（柱）+ MOM（折線）
6. 集保籌碼：大戶增減（柱）+ 散戶增減（折線）

#### Scenario: 正常顯示六面板
- **WHEN** 使用者訪問 `/investment/bare-k/2330`
- **THEN** 頁面渲染六個垂直排列的子圖，高度比例為 40:7:11:9:16:17
- **THEN** 各面板共享同一 x 軸（日期），x 軸使用 category 類型（只顯示交易日）

#### Scenario: K 棒顏色規則
- **WHEN** 當日收盤 >= 開盤
- **THEN** K 棒顯示紅色（`#E74C3C`）
- **WHEN** 當日收盤 < 開盤
- **THEN** K 棒顯示綠色（`#27AE60`）

#### Scenario: 均線渲染
- **WHEN** 圖表載入
- **THEN** MA5 顯示橘色（`#F39C12`）、MA20 藍色（`#2E86C1`）、MA60 紫色（`#8E44AD`）、MA120 灰色（`#717D7E`）
- **THEN** 260 日高以紅色虛線（`#E74C3C`, `dash='dot'`）顯示

---

### Requirement: 訊號條面板

系統 SHALL 在第 2 面板顯示 5 個條件的每日亮燈，條件包含：創260高、低波動、融資健康、營收9月高、投信買超。

#### Scenario: 條件成立時亮燈
- **WHEN** 某日某條件成立
- **THEN** 該日該條件標記以對應亮色顯示（創260高 `#E74C3C`、低波動 `#27AE60`、融資健康 `#2E86C1`、營收9月高 `#F39C12`、投信買超 `#8E44AD`）

#### Scenario: 條件不成立時暗燈
- **WHEN** 某日某條件不成立
- **THEN** 該日該條件標記以半透明灰色（`rgba(180,180,180,0.20)`）顯示

---

### Requirement: 標題與摘要資訊覆蓋層

系統 SHALL 在 K 線面板右上角顯示當日收盤價、260 日高、距離 260 高百分比；左上角顯示最後一日的 5 個條件 ✅/❌ 狀態。

#### Scenario: 距離 260 高著色
- **WHEN** 距離 < -10%
- **THEN** 距離數字顯示紅色（`#E74C3C`）
- **WHEN** -10% ≤ 距離 < -2%
- **THEN** 距離數字顯示橘色（`#F39C12`）
- **WHEN** 距離 >= -2%
- **THEN** 距離數字顯示綠色（`#27AE60`）

#### Scenario: 標題包含策略標籤
- **WHEN** 該股票在 watch_list 中有 strategies 標籤
- **THEN** 標題列末端以橘色（`#E67E22`）顯示策略名稱，以「·」分隔

---

### Requirement: 總覽頁縮圖格

系統 SHALL 在 `/investment/bare-k` 頁面以格狀佈局顯示所有自選股的摘要卡片。

#### Scenario: 卡片內容
- **WHEN** 使用者訪問總覽頁
- **THEN** 每張卡片顯示：股票代碼、公司名稱、最新收盤價、漲跌幅、距離 260 高 %、5 個訊號條件亮燈圖示

#### Scenario: 點擊卡片導航
- **WHEN** 使用者點擊任一卡片
- **THEN** 導航至 `/investment/bare-k/[code]` 詳情頁

#### Scenario: 無自選股時提示
- **WHEN** 使用者的 watch_list 為空
- **THEN** 顯示引導訊息「尚無自選股，前往管理清單」並附連結至 `/investment/watch-list`

---

### Requirement: 資料來源為 DB 快照

系統 SHALL 從 `bare_k_snapshots` 表讀取預計算資料渲染圖表，不在前端即時呼叫 FinLab API。

#### Scenario: 有快照資料時正常顯示
- **WHEN** `bare_k_snapshots` 中存在該股票的最新快照
- **THEN** 圖表使用該快照的 JSONB 欄位資料渲染

#### Scenario: 無快照資料時顯示提示
- **WHEN** `bare_k_snapshots` 中不存在該股票的快照（例如剛加入 watch_list 尚未同步）
- **THEN** 顯示「資料同步中，將於每日台灣時間 22:00 後更新」提示訊息
