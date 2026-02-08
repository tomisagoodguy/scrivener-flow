# Comprehensive Code Refactoring Plan

## Change

`refactor-code-quality-plan`

## Summary

Refactor backend XLSX parsing logic to improve robustness and maintainability, and optimize frontend holding filters to eliminate `any` type usage and redundant computations.

## Problem Analysis (分析維度)

### 1. Code Smells (程式碼氣味)

- **`ETF/parsers/xlsx_parser.py`**:
  - **Magic Strings/Numbers**: Hardcoded strings like `"資料日期"`, `"股票名稱"` and range loops `range(1, 10)` make the parser fragile.
  - **Multiple Responsibilities**: `parse_holdings_xlsx` handles file reading, date extraction, header detection, and data cleaning all in one large function.
- **`src/lib/investment/holdingFilters.ts`**:
  - **Type Safety**: Use of `any` in `ranks: any` and `(a as any)[sortField]` bypasses TypeScript safety.
  - **Hardcoded Strings**: Filter IDs and labels are hardcoded strings.

### 2. Abstractable Modules (可抽像化模組)

- **Date Parsing**: The ROC/AD date conversion logic in `xlsx_parser.py` is generic and should be in a utility module (e.g., `ETF/utils/date_utils.py`).
- **Ranking Logic**: The ranking calculation in `holdingFilters.ts` is specific but the pattern is reusable. It could be a generic utility or at least isolated.

### 3. Maintainability & Performance (可維護性與效能)

- **Frontend Performance**: `getRankedHoldings` sorts the entire array 4 times (weight, amount, marginDesc, marginAsc) every time it is called. This is O(4 * N log N).
- **Backend Robustness**: If the Excel format changes slightly (e.g., header row moves), the parser will fail or return empty data without clear diagnosis.

## Recommendations (建議呈現方式)

### Backend Refactoring

- **Problem**: Fragile XLSX parsing logic.
- **Scope**: `ETF/parsers/xlsx_parser.py`
- **Priority**: **High** (Critical for data integrity)
- **Benefit**: Robust data ingestion, easier to add new parsers for other file formats.

### Frontend Refactoring

- **Problem**: Redundant sorting and weak typing in filters.
- **Scope**: `src/lib/investment/holdingFilters.ts`
- **Priority**: **Medium**
- **Benefit**: Better type safety, improved performance for large lists, cleaner code.

## Detailed Refactoring Steps (詳細重構步驟)

### Goal: Improve Backend Parser Robustness

#### Step 1: Extract Date Utilities

1. Create `ETF/utils/date_parser.py`.
2. Move `normalize_date` logic there.
3. Add unit tests for ROC/AD date conversion.

#### Step 2: Refactor XLSX Parser

1. Refactor `xlsx_parser.py` into a structured class or decomposed functions.
2. Extract `_find_header_row` and `_extract_date` as separate logical units.
3. Replace magic strings with defined constants.

### Goal: Optimize Frontend Filters

#### Step 3: Optimize Ranking Logic

1. Modify `getRankedHoldings` to avoid re-sorting 4 times on every render if possible, or verify necessity.
2. Use strict types for `RankMap` instead of `any`.

#### Step 4: Strict Typing

1. Define a `SortableHolding` interface extending `Holding`.
2. Remove `(a as any)` casting in sort function; use type guards or indexed access.
3. Use `keyof Holding` for strict `SortField` typing.

## Testing & Rollback (測試與回滾)

- **Verification**:
  - Run `uv run pytest tests/` (or specific test file) to ensure parser output is unchanged.
  - Manual check of the Dashboard Holding Table to ensure sorting/filtering still works.
- **Rollback**:
  - `git checkout ETF/parsers/xlsx_parser.py src/lib/investment/holdingFilters.ts`
