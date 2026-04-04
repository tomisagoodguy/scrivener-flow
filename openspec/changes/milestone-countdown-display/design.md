## Context

目前里程碑日期顯示於 `RecentCases.tsx`（首頁最近案件卡片）與 `src/app/cases/[id]/page.tsx`（案件詳情頁）。日期以 `MM/DD` 格式呈現（透過 `formatMD` utility），不含剩餘天數資訊。

里程碑欄位來自 Supabase `milestones` 表：`contract_date`、`seal_date`、`tax_payment_date`、`transfer_date`、`redemption_date`、`handover_date`（均為 ISO date string `YYYY-MM-DD`）。

`src/lib/stageUtils.ts` 已有 stages 順序定義；`src/types/index.ts` 定義 `Milestone` interface。

## Goals / Non-Goals

**Goals:**
- 新增可重用的 `MilestoneCountdown` Client Component，接受 `date: string | null | undefined`，回傳帶顏色的倒數標籤
- 在 `RecentCases.tsx` 里程碑區塊套用 `MilestoneCountdown`
- 在案件詳情頁里程碑欄位套用 `MilestoneCountdown`
- 顏色規則：≥7天 綠色 / 3-6天 橘色 / 1-3天 紅色 / 0天（今日到期）紅色 / 逾期 閃爍紅色

**Non-Goals:**
- 不修改 DB schema 或 API
- 不改動里程碑的新增/編輯邏輯
- 不做伺服器端計算（日期差在 Client 端算即可）

## Decisions

### 決策 1：新建共用元件 vs. inline 計算

選擇**新建 `src/components/shared/MilestoneCountdown.tsx`**。

理由：`RecentCases.tsx`（Server Component）和案件詳情頁（混合 Client/Server）都需要倒數標籤，共用元件避免重複邏輯。元件本身需要客戶端計算（`new Date()`），設為 `'use client'`。

### 決策 2：顏色邏輯閾值

| 剩餘天數 | 顏色 | Tailwind class |
|---------|------|----------------|
| ≥ 7 天 | 綠色 | `text-green-600 bg-green-50 border-green-200` |
| 3–6 天 | 橘色 | `text-amber-600 bg-amber-50 border-amber-200` |
| 1–2 天 | 紅色 | `text-red-600 bg-red-50 border-red-200` |
| 0 天（今日） | 紅色 | 同上 |
| 逾期（< 0） | 閃爍紅色 | `text-red-700 bg-red-100 border-red-300 animate-pulse` |
| 無日期 | 隱藏 | 不渲染 |

### 決策 3：日期差計算方式

使用**日曆天數差**（非毫秒差），以台灣時區當日午夜為基準：

```ts
const today = new Date();
today.setHours(0, 0, 0, 0);
const target = new Date(date);
target.setHours(0, 0, 0, 0);
const days = Math.round((target.getTime() - today.getTime()) / 86400000);
```

### 決策 4：顯示文字格式

- 剩餘：`還有 N 天`
- 今日到期：`今日到期`
- 逾期：`已逾期 N 天`

## Risks / Trade-offs

- **時區風險**：`new Date(date)` 在不同時區可能偏移一天 → 使用 `date + 'T00:00:00'` 強制本地時間解析，或直接用字串分割年月日
- **閃爍動畫可能干擾視覺**：`animate-pulse` 僅用於逾期，避免過度使用
- **RecentCases 是 Server Component**：`MilestoneCountdown` 必須設 `'use client'`，由 RSC 傳入 date prop，符合 Next.js App Router 慣例
