# Enhancing ETF Line Notification with Market Signals

## Change

`etf-enhanced-notification`

## Summary

Expand the LINE notification content to include high-value market signals (revenue highs, price breakouts) and risk alerts, leveraging existing data from `FinlabService`.

## Problem

The current notification system ("Data Processing Report") only tells the user *what changed* in the ETF holdings (IN/OUT/Weight). It fails to provide actionable *investment insights* or *early warnings* that are already derivable from the data we possess (revenue, price, technical indicators).

## Solution

We will introduce a new "Market Signals" section to the LINE notification, derived from the data already attached in `PriceAttachStep` and processed by `indicators.py`.

### 1. New Signals to Track

* **🔥 Revenue Highs**: Stocks with `monthly_revenue` hitting a 12-month high (or implied by `revenue_momentum_rank`). *Actually, let's strictly check if current revenue is > rolling max of past 12 months.*
* **📈 Price Breakouts**: Stocks where `is_high_20d` is True.
* **📉 Revenue Crash (Risk)**: Stocks where `revenue_yoy` < -20%.

### 2. Implementation Logic

* **Step**: `NotifyStep` (No new step needed, just better data preparation within it).
* **Data Source**: The `ctx.df` already has `is_high_20d`, `revenue_yoy`, etc. attached by `PriceAttachStep`.
* **Notifier**: Update `LineNotifier.notify_completion` to accept a `signals` dictionary and render a new Flex Message block.

## Design Details

### Data Preparation (`NotifyStep`)

Extract the following from `ctx.df`:
* `breakout_stocks`: `df[df['is_high_20d'] == True]`
* `revenue_up_stocks`: `df[df['revenue_yoy'] > 20]` (or checking new highs if data available)
* `revenue_down_stocks`: `df[df['revenue_yoy'] < -20]`

### Notification Format (`LineNotifier`)

Add a **"🎯 策略亮點"** section in `notify_completion` bubble:
* **🔥 營收爆發**: List top 3 stocks with highest YoY (if > 20%).
* **📈 強勢突破**: List top 3 stocks with `is_high_20d`.
* **⚠️ 營收衰退**: List top 3 stocks with lowest YoY (if < -20%).

## Verification

- Run `etf_daily.yml` (dry run or specific test script) and check LINE output.
