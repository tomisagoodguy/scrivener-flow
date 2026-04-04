## Why

Scrivener Flow 的主要使用者年齡偏高（含 60 歲以上），需在戶外或光線不佳環境中操作。
現有介面文字大小、對比度與觸控目標無法滿足無障礙需求，影響日常作業效率與使用舒適度。

## What Changes

- 在全域設定中增加「大字體模式」切換，將介面整體縮放 1.2 倍
- 增加「高對比模式」，提升文字與背景的對比度，改善戶外強光下的可讀性
- 所有可點擊元素最小觸控目標設為 44×44px（Apple HIG 標準）
- 金額、日期等關鍵數字一律使用 `font-semibold`，從周圍文字中突出
- 所有警示色（狀態、提醒）必須搭配圖示，不依賴純色覺辨識

## Capabilities

### New Capabilities
- `accessibility-settings`: 大字體模式 + 高對比模式的 UI 設定切換，偏好儲存於 localStorage
- `font-scale-provider`: 全域 CSS 變數注入，根據模式調整 `--font-scale` 與 `--contrast-boost`

### Modified Capabilities
- （無既有 spec 需修改）

## Impact

- `src/components/layout/`：Header/SideNav 加入設定入口
- `src/app/globals.css`：新增 CSS 變數與 `.large-font` / `.high-contrast` 類別
- 所有按鈕、連結元件需確認觸控目標大小
- `src/lib/constants/`：可能新增無障礙相關常數
