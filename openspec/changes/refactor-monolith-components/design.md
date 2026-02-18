# Design: 巨石元件重構架構設計

## Context

專案目前有 20+ 個超過 200 行的巨石檔案，最嚴重的達 453 行。這些檔案違反 SRP，
將 UI 渲染、資料獲取、業務邏輯、工具函式全部混合在同一個檔案中。

本設計文件定義重構策略，確保拆分後的結構符合專案現有架構慣例（`src/services/`、
`src/hooks/`、`src/utils/`、`src/components/`）。

## Goals / Non-Goals

**Goals:**

- 每個檔案行數控制在 150 行以內（理想目標）
- 每個模組只有一個明確的職責
- 拆分後不改變任何對外 API（props、export 介面不變）
- 所有現有功能保持正常運作

**Non-Goals:**

- 不重寫業務邏輯（只移動，不改變行為）
- 不更換技術棧（保持 React + Next.js + TypeScript）
- 不改變路由結構
- 不優化效能（這是獨立的優化任務）

## Decisions

### 決策 1：分層拆分策略

採用「由內而外」的拆分順序：

1. **純函式工具** → `src/utils/` 或 `src/lib/`（無副作用，最容易測試）
2. **資料獲取邏輯** → `src/services/` 或 `src/hooks/`（可獨立測試）
3. **子元件** → 同目錄下的獨立檔案（如 `components/`）
4. **主元件** → 只保留組裝邏輯

**理由**：由內而外可以確保每一步都有明確的依賴方向，避免循環依賴。

---

### 決策 2：`revenueLabActions.ts` 拆分方案

**現狀**：453 行，包含兩個 157 行的 DB 查詢函式 + Server Action 包裝

**拆分後結構**：

```
src/
├── services/
│   └── revenueLabService.ts        # DB 查詢邏輯（fetchWinRateFromDB, fetchHeatmapFromDB）
└── app/
    └── actions/
        └── revenueLabActions.ts    # 僅保留 Server Action 包裝 + unstable_cache（~80 行）
```

**理由**：Server Actions 應只是薄薄的入口層，業務邏輯屬於 service 層。

---

### 決策 3：`useWordExport.ts` 拆分方案

**現狀**：386 行，Hook + 8 個工具函式混合

**拆分後結構**：

```
src/
├── utils/
│   └── wordExport/
│       ├── index.ts                # 統一 export
│       ├── imageProcessor.ts       # processImages, fetchGoogleDriveImage, fetchExternalImage, blobToBase64, compressImage
│       ├── htmlAssembler.ts        # assembleFullHtml, escapeHtml
│       └── fileUtils.ts            # sanitizeFilename, getDateString, convertTaskLists
└── hooks/
    └── useWordExport.ts            # 只保留 Hook 邏輯（~50 行）
```

**理由**：圖片處理、HTML 組裝是純函式，不依賴 React，應移至 utils。

---

### 決策 4：`WeatherAnimation.tsx` 拆分方案

**現狀**：374 行，單一 `renderWeatherEffect` 函式 270 行（巨型 switch-case）

**拆分後結構**：

```
src/components/layout/weather/
├── index.ts                        # re-export WeatherAnimation
├── WeatherAnimation.tsx            # 主元件（~60 行，只負責組裝）
├── effects/
│   ├── RainEffect.tsx              # 雨天動畫
│   ├── SunEffect.tsx               # 晴天動畫
│   ├── CloudEffect.tsx             # 多雲動畫
│   ├── SnowEffect.tsx              # 雪天動畫
│   └── ThunderEffect.tsx           # 雷雨動畫
└── useWeatherEffect.ts             # 天氣代碼 → 效果映射邏輯
```

**理由**：每種天氣效果是獨立的視覺元件，天然符合單一職責。

---

### 決策 5：`RevenueHeatmap.tsx` 拆分方案

**現狀**：379 行，主元件 270 行 + 工具函式 + 子元件混合

**拆分後結構**：

```
src/components/features/investment/heatmap/
├── index.ts
├── RevenueHeatmap.tsx              # 主元件（~100 行）
├── HeatmapCell.tsx                 # HeatmapCellContent 子元件
├── ColorLegend.tsx                 # ColorLegend 子元件
└── heatmapUtils.ts                 # valueToColor, textColorClass, formatMonth
```

---

### 決策 6：`WinRateLab.tsx` 拆分方案

**現狀**：341 行，MetricCard + StockListAccordion + WinRateLab 全混合

**拆分後結構**：

```
src/components/features/investment/win-rate/
├── index.ts
├── WinRateLab.tsx                  # 主元件（~120 行）
├── MetricCard.tsx                  # 統計摘要卡片
└── StockListAccordion.tsx          # 詳細名單 Accordion
```

---

### 決策 7：`identify/page.tsx` 拆分方案

**現狀**：363 行，Page 元件承擔 API 呼叫、狀態管理、UI 渲染

**拆分後結構**：

```
src/
├── hooks/
│   └── useIdentifyPage.ts          # handleUpload, copyToClipboard, 所有狀態
└── app/
    └── identify/
        └── page.tsx                # 只保留 UI 渲染（~120 行）
```

---

### 決策 8：`NoteDetail.tsx` 拆分方案

**現狀**：316 行，loadNote + checkIfLiked + handleLike + handleDelete + UI 全混合

**拆分後結構**：

```
src/
├── hooks/
│   └── useNoteDetail.ts            # loadNote, checkIfLiked, handleLike, handleDelete
└── components/knowledge/
    └── NoteDetail.tsx              # 只保留 UI 渲染（~100 行）
```

## Risks / Trade-offs

| 風險 | 嚴重度 | 緩解措施 |
|------|--------|---------|
| 重構過程中破壞現有功能 | 高 | 每個 P0/P1 任務完成後立即手動驗證 |
| Import 路徑更新遺漏 | 中 | 使用 TypeScript 編譯錯誤作為驗證手段 |
| WeatherAnimation 效果元件狀態共享問題 | 中 | 透過 props 傳遞，不使用 Context |
| `revenueLabActions.ts` 的 `unstable_cache` 行為改變 | 低 | Service 層不加 cache，只在 action 層加 |

## Open Questions

- `BasicInfoSection.tsx`（334 行）的拆分需要理解完整的 `DemoCase` 資料結構，
  建議在 P2 階段再評估具體拆分邊界
- `src/lib/crypto/` 的兩個檔案（secureApi.ts 282 行、keyManagement.ts 261 行）
  屬於安全敏感程式碼，重構需要額外謹慎，建議獨立為一個 change
