## ADDED Requirements

### Requirement: ETF 清單擴充至 21 支

`etfRegistry.ts` 與 `ETF/config/etf_registry.py` SHALL 同步擴充，新增下列 10 支 ETF，兩檔必須保持一致。

新增 ETF（基於 tw-active CATALOG + cmoney raw 資料確認）：

| 代號 | 名稱 | 投信 | 資料來源 |
|------|------|------|---------|
| 00984A | 安聯台灣高息成長 | 安聯 | 官網 API |
| 00985A | 野村台灣增強50 | 野村 | 官網 API |
| 00986A | 兆豐台灣主動 | 兆豐 | Pocket.tw（待破解） |
| 00987A | 台新優勢成長 | 台新 | Pocket.tw（待破解） |
| 00988A | 統一全球創新 | 統一 | 官網 API |
| 00990A | 元大AI新經濟 | 元大 | Pocket.tw（待破解） |
| 00992A | 群益科技創新 | 群益 | 官網 API |
| 00993A | 安聯台灣主動式 | 安聯 | 官網 API |
| 00994A | 第一金台股優選 | 第一金 | Pocket.tw（待破解） |
| 00997A | 群益美國增長 | 群益 | 官網 API |

#### Scenario: TypeScript registry 完整
- **WHEN** 讀取 `etfRegistry.ts`
- **THEN** 包含 21 支 ETF 的 code、name、color、issuer 欄位

#### Scenario: Python registry 同步
- **WHEN** 讀取 `ETF/config/etf_registry.py`
- **THEN** 與 `etfRegistry.ts` 的代號清單完全一致，且每支 ETF 包含 `source`（`finlab` / `official_api` / `pocket`）欄位

#### Scenario: 前端顏色不重複
- **WHEN** 渲染 21 支 ETF 的彩色徽章
- **THEN** 每支 ETF 使用不同顏色代碼，不發生視覺碰撞

---

### Requirement: MultiEtfStep 支援 21 支

`MultiEtfStep` SHALL 根據 `etf_registry.py` 動態讀取 ETF 清單，不硬編碼代號，確保新增 ETF 後無需修改 step 程式碼。

#### Scenario: 動態讀取清單
- **WHEN** `MultiEtfStep.run()` 執行
- **THEN** 從 `etf_registry.get_all_etf_codes()` 取得完整清單，對每支 ETF 執行爬取

#### Scenario: 單支 ETF 爬取失敗不中斷
- **WHEN** 某支 ETF 爬取失敗（HTTP 錯誤或格式異常）
- **THEN** 記錄 ERROR log，跳過該支 ETF，繼續處理其餘 ETF
