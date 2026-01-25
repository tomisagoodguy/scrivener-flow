---
title: ID Card OCR Integration
status: approved
priority: high
assignee: antique-gravity
---

# ID Card OCR Integration (身分證辨識整合)

## 1. 概述 (Overview)

整合本地 Python OCR 服務至 Next.js 網頁前端，提供使用者直接上傳身分證圖檔 (JPG/PNG) 或 PDF，並自動辨識出身分證上的關鍵資訊（姓名、出生年月日、統一編號、住址）。辨識後的資料不需永久存檔，僅供前端顯示與複製使用，以加速資料輸入流程。

## 2. 使用者需求 (User Requirements)

- **導覽列入口**: 在網站 Header 新增「辨識ID」連結。
- **支援格式**: PDF, PNG, JPG。
- **自動解析**: 上傳後自動呼叫後端 OCR 服務。
- **無痕模式**: 解析完畢後不需保留檔案。
- **關鍵欄位**:
  - 姓名
  - 出生年月日
  - 統一編號
  - 住址

## 3. 系統架構 (System Architecture)

### 3.1 前端 (Frontend)

- **路徑**: `/identify`
- **頁面元件**: `src/app/identify/page.tsx`
- **功能**:
  - 檔案上傳區塊 (Drag & Drop + 點擊上傳)。
  - 上傳中 Loading 狀態顯示。
  - 解析結果呈現卡片 (Card View)。
  - 一鍵複製按鈕 (Copy to Clipboard)。
- **導覽列**: 修改 `src/components/layout/header.tsx` 新增連結。

### 3.2 後端 (Backend API)

- **Endpoint**: `POST /api/identify`
- **邏輯**:
  1. 接收 Multipart Form Data (檔案)。
  2. 將檔案暫存至系統暫存區 (Temp Directory)。
  3. 執行 Python OCR Script (`ocr_service/main.py`)。
  4. 讀取產生的 JSON 結果檔案。
  5. **清理機制**: 刪除暫存的圖檔與產生的 JSON 檔。
  6. 回傳解析後的 JSON 資料給前端。

### 3.3 OCR 服務介接

- **路徑**: `ocr_service/main.py`
- **執行指令**: `uv run ocr_service/main.py <temp_file_path>`
- **輸入**: 檔案絕對路徑。
- **輸出**: 同路徑下產生 `ocr_result_<filename>.json`。

## 4. 實作計畫 (Implementation Plan)

1. **API 開發**: 建立 `/api/identify`，實作檔案接收、Python 呼叫與清掃邏輯。
2. **前端頁面**: 建立 `/identify/page.tsx`，設計上傳介面與結果顯示。
3. **導覽列更新**: 在 `header.tsx` 加入「辨識ID」入口。
4. **測試驗證**: 上傳測試圖檔與 PDF，確認解析正確且無殘留檔案。

## 5. 資料隱私 (Privacy)

- 確保所有上傳檔案與解析結果在 Request 結束後立即刪除。
- 不將敏感個資寫入資料庫或長期日誌。
