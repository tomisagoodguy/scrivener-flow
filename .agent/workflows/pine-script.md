---
name: pine-script-v6
description: TradingView Pine Script v6 開發規範，強調避免重繪與未來數據引用。
---

# Pine Script v6 開發規範

## 🔴 嚴格禁止

- **禁止引用未來數據** (No Future Referencing/Looking Ahead)。
- **禁止 Look-ahead Bias**。

## ✅ 最佳實踐

- **版本強制**：必須使用 `//@version=6`。
- **避免重繪**：使用 `barstate.isconfirmed` 確保信號在 K 線收盤後才觸發。
- **回測引擎**：確保實作時考慮手續費與滑價。

## 📝 代碼範例

```pinescript
//@version=6
indicator("Professional Signal", overlay=true)

// ✅ 只有在 K 線確認後才執行邏輯
if barstate.isconfirmed
    // 你的交易邏輯
    
// ✅ 明確處理空值
src = input.source(close, "Source")
ma = ta.sma(src, 14)
plot(ma)
```

---
*由 Global Rules 自動分割而成。*
