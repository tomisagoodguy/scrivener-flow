## ADDED Requirements

### Requirement: Topic heatmap block in sector strength page
The system SHALL render a `SectorTopicHeatmap` section at the bottom of the `/investment/sectors` page, displaying all topics from `topicMap.json` as colored grid cards with today's performance heat coloring.

#### Scenario: Topics loaded with price data
- **WHEN** the sectors page loads and `getTopicStockReturns` returns price data for constituent stocks
- **THEN** the heatmap SHALL display each topic card with background color derived from the median `change_pct` of its constituent stocks

#### Scenario: Topic heat color mapping
- **WHEN** a topic's median `avgRet1d` is computed
- **THEN** color SHALL map as follows: strong positive (≥ +2%) → deep rose/red, mild positive (+0.5% to +2%) → light rose, near zero (-0.5% to +0.5%) → neutral gray, mild negative (-2% to -0.5%) → light green, strong negative (≤ -2%) → deep green (台股色彩慣例：紅漲綠跌)

#### Scenario: Topic card click expands stock list
- **WHEN** user clicks a topic card
- **THEN** the card SHALL expand to show constituent stock codes and their individual change_pct values, sorted by change_pct descending

#### Scenario: No price data for a topic's stocks
- **WHEN** all constituent stocks of a topic have no price data
- **THEN** the topic card SHALL render with neutral gray background and no percentage label

##### Example: color thresholds
| avgRet1d | Expected background |
|----------|---------------------|
| +3.5% | `bg-rose-700` (deep red) |
| +1.0% | `bg-rose-400` (light red) |
| 0.0% | `bg-slate-200` (neutral) |
| -1.0% | `bg-emerald-400` (light green) |
| -3.0% | `bg-emerald-700` (deep green) |

### Requirement: Topic heatmap data flow
The system SHALL fetch topic stock returns in `sectors/page.tsx` using the existing `getTopicStockReturns` Server Action and pass the computed `TopicWithStats[]` as a prop to `SectorDashboard`, which SHALL forward it to `SectorTopicHeatmap`.

#### Scenario: Parallel data fetching
- **WHEN** the sectors page performs its data fetches
- **THEN** `getTopicStockReturns` SHALL be called in parallel with the existing `getSectorStrength`, `getTreemapData`, `getAdlData`, and `getConsensusSignals` calls using `Promise.all`
