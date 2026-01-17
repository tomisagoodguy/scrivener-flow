---
name: python-specialist
description: Python 開發規範與自動化指令。包含 uv、ruff、pytest 與非同步編程的最佳實踐。
---

# Python 開發專家規範

## 🛠 工具鏈與依賴管理

- **套件管理**：嚴格使用 `uv`。
- **Lint/Format**：使用 `ruff`。指令：`ruff check --fix && ruff format`。
- **型別檢查**：使用 `pyright` (透過 `uv run pyright`)。
- **測試框架**：使用 `pytest`。

## 🐍 程式碼風格

- **Google Docstrings**：所有函式必須包含 Docstrings。
- **Type Hints**：強制使用型別提示（必備）。
- **Asyncio**：在 I/O 密集處優先選用非同步編程。
- **環境變數**：機密資訊嚴禁 Hardcode，必須從 `.env` 讀取。

## 🚀 常用指令

| 任務 | 指令 |
|------|------|
| 初始化專案 | `uv init` |
| 安裝依賴 | `uv add <pkg>` |
| 開發依賴 | `uv add --dev <pkg>` |
| 執行腳本 | `uv run python <file>.py` |
| 執行測試 | `uv run pytest -v` |
| 檢查代碼 | `ruff check --fix` |

## 🏗️ 架構模式

- **Pydantic**：用於資料驗證與 Schema 定義。
- **FastAPI**：開發 API 優先選擇。
- **Exception handling**：使用明確的 Exception 類別，不要吞掉錯誤。

---
*由 Global Rules 自動分割而成。*
