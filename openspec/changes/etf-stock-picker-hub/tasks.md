# ETF Stock Picker Hub Tasks

## 已完成任務

- [x] 重構 `InvestmentTabs` 組件以提升效能
- [x] 優化 `HoldingsTable` 的資料快取機制
- [x] 修正 `ShareholderFlowChart` 的渲染錯誤
- [x] 完成 `StockPickerHub` 的基本骨架

## 待辦任務

- [x] 優化 `WinRateLab` 的計算邏輯（修正 YOY slider 不觸發 re-fetch 的問題，改用 onPointerUp + fetchData 統一呼叫）
- [x] 增加更多技術指標到 `StockChart`（新增 RSI(14) 面板：IndicatorService.calculateRSI 採 Wilder smoothing；StockChart 加 rsiContainerRef 獨立子圖表）
- [x] 支援多種 ETF 的比較功能（EtfComparePanel.tsx 已完整實作：持股重疊 byCount、產業分布 SectorBar、ETF 卡片 grid）
- [ ] 實作組合回測系統（此任務缺乏具體規格，需先完成 openspec design 文件後再處理）
