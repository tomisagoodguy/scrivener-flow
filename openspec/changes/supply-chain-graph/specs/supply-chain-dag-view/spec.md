## ADDED Requirements

### Requirement: Supply chain DAG page

The system SHALL provide a page at `/investment/supply-chain` that renders an interactive directed acyclic graph (DAG) of all supply chain topics and edges.

The page SHALL use React Flow with dagre layout (`top-to-bottom` direction, `nodesep=80`, `ranksep=120`).

The component SHALL be lazy-loaded via `next/dynamic` to avoid impacting other pages' bundle size.

#### Scenario: Full graph rendered

- **WHEN** user navigates to `/investment/supply-chain`
- **THEN** all nodes from `stock_topics` that appear in at least one edge are rendered
- **THEN** all edges from `topic_chain_edges` are rendered as directed arrows
- **THEN** nodes are grouped and colored by `group_name`

#### Scenario: Isolated topics hidden

- **WHEN** a topic exists in `stock_topics` but has no edges in `topic_chain_edges`
- **THEN** that topic is NOT rendered as a node in the DAG

### Requirement: Node coloring by group

Each node SHALL use a fixed color based on its `group_name` field from `stock_topics`. The 9 group names SHALL map to distinct background colors consistent with the Taiwan stock convention (no semantic red/green for up/down — this is structural coloring).

#### Scenario: Consistent group colors

- **WHEN** two nodes share the same `group_name`
- **THEN** both nodes render with the same background color

### Requirement: Node click opens holdings panel

When a node is clicked, the system SHALL update the URL with `?focus=<topic_id>` and display a right-side panel listing ETF holdings tagged with that topic.

The panel SHALL show: stock code, stock name, ETF name, weight percentage, sorted by descending weight.

The panel SHALL be populated by Server Action `getTopicHoldings(topic_id)` which JOINs `stock_topic_assignments` + `etf_holdings_snapshot` (latest `canonicalDate`).

#### Scenario: Node with ETF holdings

- **WHEN** user clicks a node whose topic has holdings in `stock_topic_assignments`
- **THEN** URL updates to `?focus=<topic_id>`
- **THEN** right panel opens showing the holdings list
- **THEN** clicked node is highlighted (e.g., border or glow)

#### Scenario: Node with no ETF holdings

- **WHEN** user clicks a node whose topic has no holdings in any ETF
- **THEN** panel opens with a message indicating no ETF holdings for this topic

#### Scenario: Direct link with focus param

- **WHEN** user loads `/investment/supply-chain?focus=cowos-advanced-packaging`
- **THEN** the DAG renders with that node highlighted and the panel pre-opened

### Requirement: URL deep link support

The page SHALL read the `focus` URL search parameter on initial load and pre-highlight the corresponding node, scrolling/centering the viewport on it.

#### Scenario: Deep link centering

- **WHEN** URL contains `?focus=<topic_id>` and the topic exists in the graph
- **THEN** the viewport auto-centers on that node within 500ms of mount
- **WHEN** URL contains `?focus=<topic_id>` and the topic does not exist
- **THEN** the graph renders normally with no highlight and no error
