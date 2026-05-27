## ADDED Requirements

### Requirement: Stock-to-topic reverse lookup map
The system SHALL provide a utility function `buildStockTopicMap()` in `src/lib/investment/topicUtils.ts` that reads `topicMap.json` and returns a `Map<string, TopicEntry[]>` mapping each stock code to the topics it belongs to.

#### Scenario: Single stock belonging to multiple topics
- **WHEN** `buildStockTopicMap()` is called and stock `"2317"` appears in two topic entries
- **THEN** the returned map at key `"2317"` SHALL contain both topic entries in array order matching topicMap.json iteration order

#### Scenario: Stock not in any topic
- **WHEN** `getStockTopics("9999")` is called for a stock code absent from topicMap.json
- **THEN** the function SHALL return an empty array `[]`

##### Example: lookup result
| Stock Code | Topics in topicMap.json | Expected getStockTopics result |
|------------|-------------------------|-------------------------------|
| `"2317"` | ai-server-odm, ems-smt | `[{id:"ai-server-odm", shortname:"AI 伺服器組裝",...}, {id:"ems-smt",...}]` |
| `"9999"` | (none) | `[]` |

### Requirement: TopicBadge React component
The system SHALL provide a `TopicBadge` React component in `src/components/features/investment/TopicBadge.tsx` that accepts `stockCode: string` and renders topic badge chips inline.

#### Scenario: Stock with 1–2 topics
- **WHEN** `<TopicBadge stockCode="2317" />` is rendered and the stock belongs to 2 topics
- **THEN** the component SHALL render 2 badge chips each showing `topic.shortname`

#### Scenario: Stock with more than 2 topics
- **WHEN** a stock belongs to N > 2 topics
- **THEN** the component SHALL render 2 badge chips for the first 2 topics and one overflow chip showing `+{N-2}`

#### Scenario: Stock with no topics
- **WHEN** a stock belongs to 0 topics
- **THEN** the component SHALL render nothing (null)

##### Example: overflow chip
- **GIVEN** stock `"2382"` belongs to 4 topics: ai-server-odm, ems-smt, bbu, hbm
- **WHEN** `<TopicBadge stockCode="2382" />` is rendered
- **THEN** output SHALL be: `[AI 伺服器組裝] [EMS 電子代工] [+2]`
