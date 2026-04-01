# 📅 時程總覽 (Timeline Hub) — 功能規劃

> **目標**：新增第四個分頁 `📅 時程`，讓使用者一頁看完所有案件的全部時間節點，跨案件交叉比對每天的進度。
>
> **建立日期**：2026-04-01

---

## 1. 資料來源清點

所有時間欄位已存在 DB，無需新增欄位：

### Milestone（每案件 1 筆）

| 欄位 | 中文 | 類型 | 圖標 |
| --- | --- | --- | --- |
| `contract_date` | 簽約日 | 里程碑 | ✍️ |
| `sign_diff_date` | 簽差日 | 里程碑 | 📝 |
| `seal_date` | 用印日 | 里程碑 | 🔏 |
| `tax_payment_date` | 完稅日 | 里程碑 | 💰 |
| `transfer_date` | 過戶日 | 里程碑 | 🏠 |
| `balance_payment_date` | 尾款日 | 里程碑 | 💵 |
| `handover_date` | 交屋日 | 里程碑 | 🔑 |
| `fee_precollect_date` | 預收規費 | 里程碑 | 📋 |
| `redemption_date` | 清償日 | 里程碑 | 🏦 |
| `tax_filing_date` | 申報日 | 里程碑 | 📄 |

### 約客（Appointments）

| 欄位 | 中文 | 類型 |
| --- | --- | --- |
| `sign_appointment` | 簽約約客 | 🤝 約定 |
| `seal_appointment` | 用印約客 | 🤝 約定 |
| `tax_appointment` | 完稅約客 | 🤝 約定 |
| `handover_appointment` | 交屋約客 | 🤝 約定 |

### Financials 稅單截止日

| 欄位 | 中文 | 類型 |
| --- | --- | --- |
| `land_value_tax_deadline` | 土增稅限繳 | ⏰ 截止 |
| `deed_tax_deadline` | 契稅限繳 | ⏰ 截止 |
| `land_tax_deadline` | 地價稅限繳 | ⏰ 截止 |
| `house_tax_deadline` | 房屋稅限繳 | ⏰ 截止 |

### 手動待辦 (todos)

| 來源 | 條件 |
| --- | --- |
| `todos` 表 | `due_date` 不為空、`is_completed = false` |

> **合計**：每個案件最多 **18 個時間點** + N 個手動待辦

---

## 2. UI 設計方案

### 整體架構：三段式佈局

```text
┌─────────────────────────────────────────────────┐
│  📅 時程總覽                                      │
├─────────────────────────────────────────────────┤
│  ① 今日焦點 — 今天 + 明天有什麼事                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 🔏 用印   │ │ 💰 完稅   │ │ 🤝 約客  │         │
│  │ AA1258376│ │ AB0023   │ │ AC9982  │         │
│  │ 辜郁珊   │ │ 王大明   │ │ 李小美  │         │
│  └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│  ② 月曆格 — 本月全覽 (可切換月份)                    │
│  ┌───┬───┬───┬───┬───┬───┬───┐                  │
│  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│                  │
│  ├───┼───┼───┼───┼───┼───┼───┤                  │
│  │   │ 1 │ 2●│ 3 │ 4●│ 5 │ 6 │  ● = 有事件    │
│  │   │   │印2│   │稅1│   │   │                  │
│  ├───┼───┼───┼───┼───┼───┼───┤                  │
│  │ 7 │ 8●│ 9 │10 │11●│12 │13 │                  │
│  │   │交1│   │   │限3│   │   │                  │
│  └───┴───┴───┴───┴───┴───┴───┘                  │
│  點擊日期 → 展開該日所有事件清單                      │
├─────────────────────────────────────────────────┤
│  ③ 甘特圖 — 跨案件時間軸 (橫向捲動)                  │
│  ┌────────┬─ 4/1 ─┬─ 4/2 ─┬─ 4/3 ─┬─ ...      │
│  │AA125837│  ■印   │       │  ●約  │           │
│  │AB00234 │       │  ■稅  │       │  ■過      │
│  │AC99821 │  ■印  │  ■稅  │       │  ●約      │
│  └────────┴───────┴───────┴───────┴─ ...        │
└─────────────────────────────────────────────────┘
```

### 設計原則

- **色彩系統**：沿用現有 `constants.ts` 的色碼（印=indigo, 稅=emerald, 過=purple, 交=red, 約客=circle, 截止=rose）
- **形狀語意**：■ 方塊=里程碑、● 圓圈=約客、▲ 三角=截止日
- **互動**：點擊案號跳轉案件詳情、hover 顯示完整資訊 tooltip
- **響應式**：手機顯示月曆格 + 堆疊列表，桌面顯示完整甘特圖

---

## 3. 檔案結構

```text
src/components/features/cases/timeline-hub/
├── TimelineHub.tsx          # 主容器 (Server → Client 橋接)
├── useTimelineHub.ts        # 資料 hook：整合所有時間來源
├── TodayFocus.tsx           # ① 今日焦點卡片
├── MonthCalendar.tsx        # ② 月曆格
├── CalendarDayDetail.tsx    # ② 日期點開的事件清單
├── CrossCaseGantt.tsx       # ③ 跨案件甘特圖
├── TimelineEventBadge.tsx   # 共用事件標記元件
└── constants.ts             # 事件類型定義（擴展自現有 timeline/constants）
```

---

## 4. 實作計畫（分 3 批）

### Batch 1：基礎骨架 + 資料 Hook

- [ ] 在 `cases/page.tsx` Tab 列新增 `📅 時程` 分頁
- [ ] 建立 `useTimelineHub.ts` — 合併 Milestone + Financials + Appointments + Todos 為統一時間事件格式
- [ ] 建立 `TimelineHub.tsx` 主容器
- [ ] 建立 `TimelineEventBadge.tsx` 共用元件

### Batch 2：今日焦點 + 月曆格

- [ ] 建立 `TodayFocus.tsx` — 顯示今天/明天的所有事件
- [ ] 建立 `MonthCalendar.tsx` — 月曆格子顯示事件密度
- [ ] 建立 `CalendarDayDetail.tsx` — 點擊日期展開事件

### Batch 3：跨案件甘特圖

- [ ] 建立 `CrossCaseGantt.tsx` — 擴展現有 `TimelineGanttView` 的邏輯
- [ ] 加入所有時間欄位（簽差、尾款、預收、清償、申報、約客、稅單截止）
- [ ] 加入篩選（按事件類型、按案件、按日期範圍）

---

## 5. 與現有元件的關係

| 現有元件 | 作用 | 本功能的關係 |
| --- | --- | --- |
| `TimelineGanttView` | 30 天甘特（僅承辦中頁顯示） | **擴展** — 甘特圖加上更多時間欄位 |
| `GlobalPipelineChart` | 階段圓圈圖 | **互補** — Pipeline 看階段，Timeline Hub 看日期 |
| `PipelineView` | 儀表板 7 天預告 | **整合** — 今日焦點是它的增強版 |
| `TaxWatch` | 稅單截止監控 | **吸收** — 稅單截止日會出現在月曆和甘特中 |
| `UrgentAlerts` | ≤3天緊急警示 | **互補** — 保留原位，Timeline 提供全域視角 |

---

## 6. Phase 2（可選）

- [ ] 拖曳調整日期（直接在甘特圖改日期）
- [ ] 列印 / 匯出 PDF 月排程
- [ ] 行事曆同步（Google Calendar / iCal）
- [ ] 衝突偵測（同一天超過 N 件事自動警告）

---

## 7. 技術備註

### 現有可複用的模組

- `src/components/dashboard/timeline/constants.ts` — MILESTONES / TAX_DEADLINES / APPOINTMENTS 定義
- `src/components/dashboard/timeline/useTimelineData.ts` — 甘特資料處理邏輯
- `src/lib/stageUtils.ts` — 案件階段判斷
- `src/utils/publicHolidays.ts` — 國定假日標示

### 資料查詢

```sql
-- 與 cases/page.tsx 相同的查詢，已包含所有需要的 JOIN
SELECT *, milestones(*), financials(*), todos_list:todos(*)
FROM cases
WHERE user_id = ? AND status != 'Closed' AND status != 'Cancelled'
ORDER BY created_at DESC;
```

不需要額外的 API 或 DB 變更。
