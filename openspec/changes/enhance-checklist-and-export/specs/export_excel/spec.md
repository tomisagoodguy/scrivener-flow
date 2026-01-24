# Spec: Fix Excel Export Dependency

## ADDED Requirements

#### Scenario: Build Success

- **Given** the application is building
- **When** `exceljs` is imported in `ExportExcelButton`
- **Then** it should successfully resolve `uuid` and not crash the build.

## Implementation Details

- Add `uuid` package consistent with `exceljs` requirements.
