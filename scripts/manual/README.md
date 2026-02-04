# Manual Test Scripts

此目錄包含手動執行的測試與除錯腳本。

**注意：這些不是自動化測試，不會被 pytest 或 Jest 執行。**

## 腳本清單

### test_line.py

測試 LINE Messaging API 連線能力。

```bash
uv run python scripts/manual/test_line.py
```

### test_line_notification.py

測試 LINE 推播通知功能。

```bash
uv run python scripts/manual/test_line_notification.py
```

### check_db_latest.py

檢查資料庫中最新的資料狀態。

```bash
uv run python scripts/manual/check_db_latest.py
```

## 使用時機

- 初次設定環境變數後驗證連線
- 除錯 API 相關問題
- 開發時快速驗證功能

## 相關自動化測試

如需自動化測試，請查看：

- `tests/integration/test_finlab_connection.py` - Finlab API 整合測試
- `tests/unit/etf/` - ETF 模組單元測試
