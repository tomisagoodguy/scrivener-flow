## Summary

Hide ETFs that currently have no holdings data from every ETF listing surface in the investment module, so users never land on empty cards or blank drilldown pages.

## Motivation

The ETF registry (`src/lib/investment/etfRegistry.ts`) contains ETFs whose holdings cannot be scraped — e.g. 00998A holds foreign equities that Pocket.tw does not cover, so `etf_holdings_snapshot` has zero rows for it. Every listing surface iterates the static registry, so these data-less ETFs render as empty overview cards, dead "深潛明細" quick links, and blank drilldown pages reachable via the `EtfSelector` switcher ("觀察下一個標的時會直接沒數據"). Users want these skipped until real data exists.

## Proposed Solution

Derive the set of "active" ETF codes dynamically from holdings presence (an ETF is active when it has at least one holding on its latest disclosure date, i.e. `holdingsCount > 0`), and filter every listing surface by that set:

- `/investment` page: filter the "深潛明細" quick-link list and the `EtfOverviewGrid` cards to active ETFs only.
- `StockPickerHub` source (`etfsForPicker`): exclude ETFs with empty holdings.
- `EtfSelector` (drilldown switcher): accept the active-codes set as a prop and only render buttons for active ETFs, so the "next target" navigation never points to an empty ETF.

The filter reads from existing computed data (`getEtfOverviewStats()` already returns `holdingsCount` and `dataDate` per ETF; `getAllHoldings()` returns `byEtf` keyed by code). No hardcoded exclusion list is introduced — when a scraper is fixed and data appears, the ETF reappears automatically.

## Non-Goals

- Not removing any ETF from `ETF_REGISTRY` or `ETF_CODES`; the registry stays the single source of truth and the pipeline still attempts to scrape every ETF.
- Not changing pipeline scraping, diff computation, or any data-layer behavior.
- Not changing the direct-URL behavior of `/investment/<code>` for a data-less ETF beyond what already exists (it remains reachable by direct URL; only listing/navigation surfaces hide it).
- Not adding a "no data" placeholder card — the user chose to hide empty ETFs entirely.

## Alternatives Considered

- **Static `hasData` flag in `etfRegistry.ts`**: rejected — requires manual maintenance and would not auto-recover when a scraper is fixed; violates the project's single-source-of-truth / no-hardcoding rules.
- **Hide only navigation, keep empty overview cards**: rejected by the user; they chose to hide empty ETFs from all surfaces.

## Impact

- Affected specs: new capability `etf-empty-data-hidden`
- Affected code:
  - Modified:
    - src/app/investment/page.tsx
    - src/components/features/investment/EtfSelector.tsx
    - src/app/investment/[etf]/page.tsx
    - src/components/features/investment/EtfOverviewGrid.tsx
  - New:
    - src/lib/investment/activeEtfs.ts
  - Removed: (none)
