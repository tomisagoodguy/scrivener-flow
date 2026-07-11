# dark-mode-theming Specification

## Purpose

TBD - created by archiving change 'dark-theme-override-cleanup'. Update Purpose after archive.

## Requirements

### Requirement: 元件自帶顏色不被深色模式結構覆蓋 hijack
深色模式的全域覆蓋 SHALL NOT 以「與顏色無關的結構性選擇器」（如 `.rounded-*`、`.shadow-*`、`<button>`、`[class*="card"]`、`[class*="panel"]`、`[class*="section"]`、`[class*="container"]`）強制 `background-color`。帶 inline style 或 Tailwind arbitrary value 背景／文字色的元件，在深色模式下 SHALL 保留其自身指定的顏色。

#### Scenario: inline 背景色卡片在深色模式維持原色
- **WHEN** 一個元件以 inline `style={{ backgroundColor }}` 設定主題色，且掛有 `rounded-lg` 或為 `<button>`
- **THEN** 切換到深色模式後，該元件 SHALL 顯示其 inline 指定的背景色，而非被全域 `!important` 壓成統一深灰

#### Scenario: 主題熱力卡片各自顏色（深淺一致）
- **WHEN** 使用者在 `/investment/sectors`「主題」視圖切換深／淺色模式
- **THEN** 每張主題卡片 SHALL 顯示各自的主題色，且文字對比相對於卡片自身顏色正確（深淺兩模式結果一致）


<!-- @trace
source: dark-theme-override-cleanup
updated: 2026-07-11
code:
  - ETF/pipeline/context.py
  - src/app/investment/manager/components/SignalsPanel.tsx
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - src/lib/cases/htmlExport.ts
  - ETF/pipeline/steps/aum_sync_step.py
  - src/app/investment/manager/components/GapTablePanel.tsx
  - supabase/migrations/20260706000001_fund_holdings_monthly.sql
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - ETF/scrapers/twse_chips_scraper.py
  - src/app/actions/getManagerDualTrack.ts
  - ETF/analysis/fund_signals.py
  - ETF/scrapers/mops_fund_scraper.py
  - next-env.d.ts
  - src/app/investment/manager/components/EtfHoldingsPanel.tsx
  - src/hooks/useWeather.ts
  - src/app/actions/getStrategySignals.ts
  - src/components/features/investment/DailyFlowPanel.tsx
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/scrapers/taifex_scraper.py
  - ETF/services/finlab/client.py
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/components/features/investment/EtfSelector.tsx
  - src/types/investment.ts
  - supabase/migrations/20260706000003_fund_manager_map.sql
  - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - ETF/pipeline/orchestrator.py
  - ETF/run_fund_holdings_sync.py
  - src/app/investment/manager/components/ManagerPicker.tsx
  - CLAUDE.md
  - ETF/CLAUDE.md
  - .github/workflows/fund_holdings_monthly.yml
  - src/lib/investment/streakUtils.ts
  - src/lib/cases/exportInteractive.ts
  - ETF/scrapers/etf_dividend_scraper.py
  - src/app/investment/streaks/page.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/market-chips/SignalTable.tsx
  - docs/TW_ACTIVE_INTEGRATION_REPORT.md
  - src/app/globals.css
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/strategy_signal_step.py
  - ETF/sync_stock_financials.py
  - src/components/features/investment/market-chips/SignalTabs.tsx
  - src/lib/investment/activeEtfs.ts
  - ETF/scripts/backfill_aum_mechanics.py
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - supabase/migrations/20260706000002_fund_holdings_quarterly.sql
  - src/app/actions/getMarketChips.ts
  - src/app/investment/layout.tsx
  - src/app/investment/market-chips/page.tsx
  - src/lib/investment/etfSectorActivityUtils.ts
  - ETF/config/fund_manager_map.py
  - src/app/investment/manager/components/FundHoldingsPanel.tsx
  - ETF/pipeline/steps/market_chips_step.py
  - src/components/features/investment/market-chips/MarginBalanceChart.tsx
  - src/app/dark-theme.css
  - supabase/migrations/20260706000024_institutional_signals.sql
  - jest.config.js
  - supabase/migrations/20260706000004_fund_signals.sql
  - ETF/pipeline/steps/dividend_sync_step.py
  - src/app/actions/getTreemapData.ts
  - supabase/migrations/20260706000011_etf_aum_series_mechanics_columns.sql
  - .github/workflows/etf_daily.yml
  - .github/workflows/etf_financials.yml
  - ETF/pipeline/steps/sector_strength_step.py
  - src/components/features/investment/market-chips/RetailRatioChart.tsx
  - ETF/analysis/__init__.py
  - supabase/migrations/20260708000001_fund_tables_public_read.sql
  - ETF/scrapers/sitca_scraper.py
  - src/app/actions/getStreaks.ts
  - src/components/dashboard/work-dashboard/PipelineView.tsx
  - tsconfig.tsbuildinfo
  - src/app/actions/strategyRegistry.ts
  - ETF/pipeline/steps/sync_treemap_step.py
  - ETF/utils/fund_name_normalizer.py
  - src/components/features/cases/ExportHtmlButton.tsx
  - ETF/scripts/backfill_fund_holdings_mops.py
  - src/components/features/investment/market-chips/FuturesPositionChart.tsx
  - src/app/investment/manager/page.tsx
  - supabase/migrations/20260706000021_futures_institutional_daily.sql
  - supabase/migrations/20260706000022_market_margin_daily.sql
  - src/components/features/investment/EtfStockTradeView.tsx
  - supabase/migrations/20260706000012_etf_dividend_records.sql
  - supabase/migrations/20260706000023_institutional_stock_daily.sql
  - src/components/features/investment/DualAxisChart.tsx
tests:
  - ETF/tests/test_market_chips_step.py
  - ETF/tests/test_fund_signals.py
  - ETF/tests/test_taifex_scraper.py
  - ETF/tests/fixtures/mops_t78sb39_q3_sample.html
  - ETF/tests/fixtures/sitca_in2630_sample.html
  - ETF/tests/test_sector_fund_flow.py
  - ETF/tests/fixtures/sitca_in2629_sample.html
  - ETF/tests/test_fund_holdings_sync.py
  - src/app/actions/__tests__/getManagerDualTrack.test.ts
  - ETF/test_strategy_simple.py
  - ETF/tests/fixtures/twse_t86_sample.json
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - ETF/tests/test_aum_sync_step.py
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
  - ETF/tests/fixtures/tpex_institutional_sample.json
  - ETF/tests/test_mops_fund_scraper.py
  - src/lib/investment/__tests__/activeEtfs.test.ts
  - ETF/tests/test_cleanup_old_data.py
  - src/lib/cases/__tests__/htmlExport.test.ts
  - ETF/tests/test_twse_chips_scraper.py
  - ETF/tests/fixtures/taifex_daily_mtx_sample.csv
  - src/types/__tests__/investment.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/components/features/investment/__tests__/EtfOverviewGridFilter.test.tsx
  - ETF/tests/test_fund_name_normalizer.py
  - ETF/tests/test_etf_dividend_scraper.py
  - ETF/tests/fixtures/twse_margin_sample.json
  - ETF/tests/fixtures/taifex_fut_contracts_sample.html
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - src/__tests__/lib/streakUtils.test.ts
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - src/components/features/investment/__tests__/EtfSelector.test.tsx
  - ETF/tests/test_sitca_scraper.py
-->

---
### Requirement: 深色背景以元件層級宣告為主
新元件需要深色背景時 SHALL 使用元件層級的 Tailwind `dark:` variant 或 `.glass-card`（其經由設計 token 自帶深色處理），而非新增全域地毯式 `!important` 覆蓋。

#### Scenario: 新容器宣告深色背景
- **WHEN** 開發者為新卡片容器指定深色背景
- **THEN** 該容器 SHALL 透過 `dark:bg-*` 類別或 `.glass-card` 取得深色背景
- **AND** SHALL NOT 依賴 `html.dark .rounded-lg` 之類結構選擇器來著色


<!-- @trace
source: dark-theme-override-cleanup
updated: 2026-07-11
code:
  - ETF/pipeline/context.py
  - src/app/investment/manager/components/SignalsPanel.tsx
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - src/lib/cases/htmlExport.ts
  - ETF/pipeline/steps/aum_sync_step.py
  - src/app/investment/manager/components/GapTablePanel.tsx
  - supabase/migrations/20260706000001_fund_holdings_monthly.sql
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - ETF/scrapers/twse_chips_scraper.py
  - src/app/actions/getManagerDualTrack.ts
  - ETF/analysis/fund_signals.py
  - ETF/scrapers/mops_fund_scraper.py
  - next-env.d.ts
  - src/app/investment/manager/components/EtfHoldingsPanel.tsx
  - src/hooks/useWeather.ts
  - src/app/actions/getStrategySignals.ts
  - src/components/features/investment/DailyFlowPanel.tsx
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/scrapers/taifex_scraper.py
  - ETF/services/finlab/client.py
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/components/features/investment/EtfSelector.tsx
  - src/types/investment.ts
  - supabase/migrations/20260706000003_fund_manager_map.sql
  - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - ETF/pipeline/orchestrator.py
  - ETF/run_fund_holdings_sync.py
  - src/app/investment/manager/components/ManagerPicker.tsx
  - CLAUDE.md
  - ETF/CLAUDE.md
  - .github/workflows/fund_holdings_monthly.yml
  - src/lib/investment/streakUtils.ts
  - src/lib/cases/exportInteractive.ts
  - ETF/scrapers/etf_dividend_scraper.py
  - src/app/investment/streaks/page.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/market-chips/SignalTable.tsx
  - docs/TW_ACTIVE_INTEGRATION_REPORT.md
  - src/app/globals.css
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/strategy_signal_step.py
  - ETF/sync_stock_financials.py
  - src/components/features/investment/market-chips/SignalTabs.tsx
  - src/lib/investment/activeEtfs.ts
  - ETF/scripts/backfill_aum_mechanics.py
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - supabase/migrations/20260706000002_fund_holdings_quarterly.sql
  - src/app/actions/getMarketChips.ts
  - src/app/investment/layout.tsx
  - src/app/investment/market-chips/page.tsx
  - src/lib/investment/etfSectorActivityUtils.ts
  - ETF/config/fund_manager_map.py
  - src/app/investment/manager/components/FundHoldingsPanel.tsx
  - ETF/pipeline/steps/market_chips_step.py
  - src/components/features/investment/market-chips/MarginBalanceChart.tsx
  - src/app/dark-theme.css
  - supabase/migrations/20260706000024_institutional_signals.sql
  - jest.config.js
  - supabase/migrations/20260706000004_fund_signals.sql
  - ETF/pipeline/steps/dividend_sync_step.py
  - src/app/actions/getTreemapData.ts
  - supabase/migrations/20260706000011_etf_aum_series_mechanics_columns.sql
  - .github/workflows/etf_daily.yml
  - .github/workflows/etf_financials.yml
  - ETF/pipeline/steps/sector_strength_step.py
  - src/components/features/investment/market-chips/RetailRatioChart.tsx
  - ETF/analysis/__init__.py
  - supabase/migrations/20260708000001_fund_tables_public_read.sql
  - ETF/scrapers/sitca_scraper.py
  - src/app/actions/getStreaks.ts
  - src/components/dashboard/work-dashboard/PipelineView.tsx
  - tsconfig.tsbuildinfo
  - src/app/actions/strategyRegistry.ts
  - ETF/pipeline/steps/sync_treemap_step.py
  - ETF/utils/fund_name_normalizer.py
  - src/components/features/cases/ExportHtmlButton.tsx
  - ETF/scripts/backfill_fund_holdings_mops.py
  - src/components/features/investment/market-chips/FuturesPositionChart.tsx
  - src/app/investment/manager/page.tsx
  - supabase/migrations/20260706000021_futures_institutional_daily.sql
  - supabase/migrations/20260706000022_market_margin_daily.sql
  - src/components/features/investment/EtfStockTradeView.tsx
  - supabase/migrations/20260706000012_etf_dividend_records.sql
  - supabase/migrations/20260706000023_institutional_stock_daily.sql
  - src/components/features/investment/DualAxisChart.tsx
tests:
  - ETF/tests/test_market_chips_step.py
  - ETF/tests/test_fund_signals.py
  - ETF/tests/test_taifex_scraper.py
  - ETF/tests/fixtures/mops_t78sb39_q3_sample.html
  - ETF/tests/fixtures/sitca_in2630_sample.html
  - ETF/tests/test_sector_fund_flow.py
  - ETF/tests/fixtures/sitca_in2629_sample.html
  - ETF/tests/test_fund_holdings_sync.py
  - src/app/actions/__tests__/getManagerDualTrack.test.ts
  - ETF/test_strategy_simple.py
  - ETF/tests/fixtures/twse_t86_sample.json
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - ETF/tests/test_aum_sync_step.py
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
  - ETF/tests/fixtures/tpex_institutional_sample.json
  - ETF/tests/test_mops_fund_scraper.py
  - src/lib/investment/__tests__/activeEtfs.test.ts
  - ETF/tests/test_cleanup_old_data.py
  - src/lib/cases/__tests__/htmlExport.test.ts
  - ETF/tests/test_twse_chips_scraper.py
  - ETF/tests/fixtures/taifex_daily_mtx_sample.csv
  - src/types/__tests__/investment.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/components/features/investment/__tests__/EtfOverviewGridFilter.test.tsx
  - ETF/tests/test_fund_name_normalizer.py
  - ETF/tests/test_etf_dividend_scraper.py
  - ETF/tests/fixtures/twse_margin_sample.json
  - ETF/tests/fixtures/taifex_fut_contracts_sample.html
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - src/__tests__/lib/streakUtils.test.ts
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - src/components/features/investment/__tests__/EtfSelector.test.tsx
  - ETF/tests/test_sitca_scraper.py
-->

---
### Requirement: 保留語意色彩柔化
本能力 SHALL 保留既有的語意色彩覆蓋（rose／red／amber 文字與背景柔化、input／select、`.text-foreground`、`.text-primary`、`.movement-none-badge`、`.topic-heat-cell`），這些屬顏色語意微調而非結構性 hijack。

#### Scenario: 台股紅綠語意在深色模式維持
- **WHEN** 深色模式下顯示漲跌數值
- **THEN** rose（漲）／emerald（跌）語意色彩 SHALL 維持既有柔化處理，不受本次清理影響

<!-- @trace
source: dark-theme-override-cleanup
updated: 2026-07-11
code:
  - ETF/pipeline/context.py
  - src/app/investment/manager/components/SignalsPanel.tsx
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - src/lib/cases/htmlExport.ts
  - ETF/pipeline/steps/aum_sync_step.py
  - src/app/investment/manager/components/GapTablePanel.tsx
  - supabase/migrations/20260706000001_fund_holdings_monthly.sql
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - ETF/scrapers/twse_chips_scraper.py
  - src/app/actions/getManagerDualTrack.ts
  - ETF/analysis/fund_signals.py
  - ETF/scrapers/mops_fund_scraper.py
  - next-env.d.ts
  - src/app/investment/manager/components/EtfHoldingsPanel.tsx
  - src/hooks/useWeather.ts
  - src/app/actions/getStrategySignals.ts
  - src/components/features/investment/DailyFlowPanel.tsx
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/scrapers/taifex_scraper.py
  - ETF/services/finlab/client.py
  - src/app/investment/[etf]/page.tsx
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/components/features/investment/EtfSelector.tsx
  - src/types/investment.ts
  - supabase/migrations/20260706000003_fund_manager_map.sql
  - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - ETF/pipeline/orchestrator.py
  - ETF/run_fund_holdings_sync.py
  - src/app/investment/manager/components/ManagerPicker.tsx
  - CLAUDE.md
  - ETF/CLAUDE.md
  - .github/workflows/fund_holdings_monthly.yml
  - src/lib/investment/streakUtils.ts
  - src/lib/cases/exportInteractive.ts
  - ETF/scrapers/etf_dividend_scraper.py
  - src/app/investment/streaks/page.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/market-chips/SignalTable.tsx
  - docs/TW_ACTIVE_INTEGRATION_REPORT.md
  - src/app/globals.css
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/strategy_signal_step.py
  - ETF/sync_stock_financials.py
  - src/components/features/investment/market-chips/SignalTabs.tsx
  - src/lib/investment/activeEtfs.ts
  - ETF/scripts/backfill_aum_mechanics.py
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - supabase/migrations/20260706000002_fund_holdings_quarterly.sql
  - src/app/actions/getMarketChips.ts
  - src/app/investment/layout.tsx
  - src/app/investment/market-chips/page.tsx
  - src/lib/investment/etfSectorActivityUtils.ts
  - ETF/config/fund_manager_map.py
  - src/app/investment/manager/components/FundHoldingsPanel.tsx
  - ETF/pipeline/steps/market_chips_step.py
  - src/components/features/investment/market-chips/MarginBalanceChart.tsx
  - src/app/dark-theme.css
  - supabase/migrations/20260706000024_institutional_signals.sql
  - jest.config.js
  - supabase/migrations/20260706000004_fund_signals.sql
  - ETF/pipeline/steps/dividend_sync_step.py
  - src/app/actions/getTreemapData.ts
  - supabase/migrations/20260706000011_etf_aum_series_mechanics_columns.sql
  - .github/workflows/etf_daily.yml
  - .github/workflows/etf_financials.yml
  - ETF/pipeline/steps/sector_strength_step.py
  - src/components/features/investment/market-chips/RetailRatioChart.tsx
  - ETF/analysis/__init__.py
  - supabase/migrations/20260708000001_fund_tables_public_read.sql
  - ETF/scrapers/sitca_scraper.py
  - src/app/actions/getStreaks.ts
  - src/components/dashboard/work-dashboard/PipelineView.tsx
  - tsconfig.tsbuildinfo
  - src/app/actions/strategyRegistry.ts
  - ETF/pipeline/steps/sync_treemap_step.py
  - ETF/utils/fund_name_normalizer.py
  - src/components/features/cases/ExportHtmlButton.tsx
  - ETF/scripts/backfill_fund_holdings_mops.py
  - src/components/features/investment/market-chips/FuturesPositionChart.tsx
  - src/app/investment/manager/page.tsx
  - supabase/migrations/20260706000021_futures_institutional_daily.sql
  - supabase/migrations/20260706000022_market_margin_daily.sql
  - src/components/features/investment/EtfStockTradeView.tsx
  - supabase/migrations/20260706000012_etf_dividend_records.sql
  - supabase/migrations/20260706000023_institutional_stock_daily.sql
  - src/components/features/investment/DualAxisChart.tsx
tests:
  - ETF/tests/test_market_chips_step.py
  - ETF/tests/test_fund_signals.py
  - ETF/tests/test_taifex_scraper.py
  - ETF/tests/fixtures/mops_t78sb39_q3_sample.html
  - ETF/tests/fixtures/sitca_in2630_sample.html
  - ETF/tests/test_sector_fund_flow.py
  - ETF/tests/fixtures/sitca_in2629_sample.html
  - ETF/tests/test_fund_holdings_sync.py
  - src/app/actions/__tests__/getManagerDualTrack.test.ts
  - ETF/test_strategy_simple.py
  - ETF/tests/fixtures/twse_t86_sample.json
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - ETF/tests/test_aum_sync_step.py
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
  - ETF/tests/fixtures/tpex_institutional_sample.json
  - ETF/tests/test_mops_fund_scraper.py
  - src/lib/investment/__tests__/activeEtfs.test.ts
  - ETF/tests/test_cleanup_old_data.py
  - src/lib/cases/__tests__/htmlExport.test.ts
  - ETF/tests/test_twse_chips_scraper.py
  - ETF/tests/fixtures/taifex_daily_mtx_sample.csv
  - src/types/__tests__/investment.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/components/features/investment/__tests__/EtfOverviewGridFilter.test.tsx
  - ETF/tests/test_fund_name_normalizer.py
  - ETF/tests/test_etf_dividend_scraper.py
  - ETF/tests/fixtures/twse_margin_sample.json
  - ETF/tests/fixtures/taifex_fut_contracts_sample.html
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - src/__tests__/lib/streakUtils.test.ts
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - src/components/features/investment/__tests__/EtfSelector.test.tsx
  - ETF/tests/test_sitca_scraper.py
-->