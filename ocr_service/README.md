# OCR Service (中華民國身分證掃描模組)

這個模組使用 PaddleOCR 與 OpenCV 來識別圖片中的文字，特別針對中文內容進行優化。

## 環境需求

- Python 3.10+ (由 `uv` 管理)
- PaddleOCR
- OpenCV

## 安裝

本專案使用 `uv` 進行套件管理。如果您尚未安裝 `uv`，請參考 [uv 官方文件](https://github.com/astral-sh/uv)。

確保在 `ocr_service` 目錄下：

```bash
uv sync
```

## 使用方法

### 掃描圖片或 PDF

直接執行 `main.py` 並帶入圖片或 PDF 路徑：

```bash
uv run main.py <圖片或PDF路徑>
```

例如：

```bash
uv run main.py sample_id_card.jpg
# 或
uv run main.py document.pdf
```

### 第一次執行注意

第一次執行時，PaddleOCR 會自動下載必要的模型檔案（檢測模型、方向分類模型、識別模型），這可能需要一點時間。之後執行速度會變快。

## 功能

- 支援繁體中文/簡體中文識別
- 支援文字角度偵測 (身分證歪斜也可識別)
- 輸出識別文字與信心度
- 簡單的身分證欄位關鍵字匹配 (姓名、出生日期、身分證字號格式)

## 開發

若要新增依賴：

```bash
uv add <package_name>
```
