---
name: quant-finance
description: 金融數據處理、演算法交易與量化分析規範。
---

# 金融與量化分析規範

## 💹 核心原則

- **風險管理優先**：始終考慮最大回撤 (MDD) 與風險值 (VaR)。
- **查證 API 版本**：使用 `context7` 確保 API 用法正確。
- **數據完整性**：處理 Missing Data, Outliers 與 Survivorship Bias。

## 📈 交易系統模式 (Interactive Brokers)

- **指數退避重試** (Exponential Backoff)：避免 API Rate Limit。
- **斷路器模式** (Circuit Breaker)：系統異常時自動暫停交易。

## 📊 回測指標

- **夏普比率** (Sharpe Ratio)
- **索提諾比率** (Sortino Ratio)
- **勝率與期望值**
- **風險管理**：參考凱利公式 (Kelly Criterion)。

---
*由 Global Rules 自動分割而成。*
