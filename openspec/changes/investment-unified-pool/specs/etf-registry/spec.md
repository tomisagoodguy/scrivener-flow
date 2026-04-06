# Spec: etf-registry

## ADDED Requirements

### Requirement: ETF Registry as Single Source of Truth
`src/lib/investment/etfRegistry.ts` SHALL export an `ETF_REGISTRY` array containing all tracked ETFs. All page-level constants (`ETF_META`, `COMPARE_ETF_META`, `SUPPORTED_ETFS`, `COMPARE_ETF_CODES`) MUST be derived from this registry rather than hardcoded.

#### Scenario: Adding a new ETF
- **WHEN** a developer adds a new entry to `ETF_REGISTRY` in `etfRegistry.ts`
- **THEN** the new ETF SHALL automatically appear in the pool page, drilldown selector, diff ledger filter, and ETF compare panel without any other file changes

#### Scenario: Registry entry structure
- **WHEN** a registry entry is defined
- **THEN** it MUST contain: `code` (e.g. `'00981A'`), `shortCode`, `name`, `manager`, `color` (hex), `dataSource` (`'fhtrust' | 'moneydj'`)

### Requirement: Derived helper exports
The registry module SHALL export derived helpers for common access patterns.

#### Scenario: Accessing all ETF codes
- **WHEN** any module imports `ETF_CODES` from the registry
- **THEN** it SHALL receive a string array of all registered ETF codes, in the same order as `ETF_REGISTRY`

#### Scenario: Looking up ETF metadata by code
- **WHEN** any module calls `getEtfMeta(code)`
- **THEN** it SHALL return the matching `EtfRegistryEntry` or `undefined` if not found
