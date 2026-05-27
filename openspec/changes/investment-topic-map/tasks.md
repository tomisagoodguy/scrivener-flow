## Tasks

<!-- Implements: Requirement "Batch topic stock returns lookup" (specs/topic-stock-returns/spec.md) -->
<!-- Implements: Requirement "Topic cards grid view" (specs/investment-topic-map-view/spec.md) -->
<!-- Covers: D1：資料載入方式, D2：UI 佈局, D3：Server Action getTopicStockReturns, D4：TopicCard 顏色計算, D5：SideNav 新增連結 (design.md) -->

### Phase 1: Server Action & Data Layer

- [x] [P] **Task 1**: Implement Requirement "Batch topic stock returns lookup" — Create `src/app/actions/getTopicStockReturns.ts`
  - Import `createClient` from `src/lib/supabase/server.ts`
  - Function signature: `export async function getTopicStockReturns(stockCodes: string[]): Promise<Record<string, { change_pct: number | null; close: number | null; stock_name: string | null }>>`
  - Query: `SELECT stock_code, change_pct, close, stock_name FROM market_treemap_daily WHERE date = (SELECT MAX(date) FROM market_treemap_daily) AND stock_code = ANY($1)`
  - Use Supabase `.in('stock_code', stockCodes)` after fetching `maxDate` with a separate `.select('date').order('date', {ascending:false}).limit(1)` query
  - On empty result or error, return `{}`
  - Build and return `Record<string, { change_pct, close, stock_name }>` from the rows

- [x] [P] **Task 2**: Add `getDataDate` helper to `getTopicStockReturns.ts`
  - Export `async function getTopicDataDate(): Promise<string | null>` that returns the MAX date from `market_treemap_daily`
  - Used by the page Server Component to display the data date

### Phase 2: Topic Map Page

- [x] **Task 3**: Implement Requirement "Topic cards grid view" D1/D2 — Create `src/app/investment/topics/page.tsx` (Server Component)
  - `export const revalidate = 3600`
  - Import `topicMap` from `src/lib/investment/topicMap.json` (Next.js supports JSON imports)
  - Import `getTopicStockReturns`, `getTopicDataDate` from `src/app/actions/getTopicStockReturns.ts`
  - Collect all unique stock codes from `topicMap` (use `Set<string>`)
  - Call `getTopicStockReturns(allStockCodes)` and `getTopicDataDate()` in `Promise.all`
  - Compute `avgRet1d` for each topic: collect `change_pct` values for component stocks, sort, return median; return `null` if fewer than 1 stock has data
  - Type for enriched topic: `interface TopicWithStats { id: string; shortname: string; name: string; group: string; description: string; stocks: string[]; companyCount: number; avgRet1d: number | null; stockReturns: Record<string, { change_pct: number | null; close: number | null; stock_name: string | null }> }`
  - Pass `topicsWithStats`, `dataDate` to `<TopicsDashboard>` Client Component
  - Page title: `metadata = { title: '產業題材 | 投資監控' }`

- [x] **Task 4**: Implement D4：TopicCard 顏色計算 — Create `src/app/investment/topics/TopicCard.tsx` (Client Component)
  - Props: `{ topic: TopicWithStats; isSelected: boolean; onClick: () => void }`
  - Card layout: fixed height ~140px, `glass-card` class + colored left border (4px) or background overlay using `blockColor(topic.avgRet1d)` from `src/lib/investment/treemapUtils.ts`
  - Show: `topic.shortname` (font-semibold), group badge (small pill), `topic.companyCount` stocks count, `fmtPct(topic.avgRet1d)` with `pctClass` from `src/lib/investment/formatUtils.ts`
  - `isSelected` state: apply `ring-2 ring-blue-400`
  - Export `TopicWithStats` interface from this file OR from a shared types location

- [x] **Task 5**: Create `src/app/investment/topics/TopicsDashboard.tsx` (Client Component, ≤150 lines)
  - Props: `{ topics: TopicWithStats[]; dataDate: string | null }`
  - State: `selectedGroup: string` (default `'全部'`), `searchQuery: string`, `selectedTopicId: string | null`
  - Groups list: `['全部', ...Array.from(new Set(topics.map(t => t.group))).sort()]`
  - Group tabs: horizontal scroll row, `overflow-x-auto`, each tab is a button with active style
  - Search input: `glass-input` style, positioned right of or below group tabs
  - Filtered topics: filter by `selectedGroup !== '全部'` AND search query (case-insensitive match on `shortname + name + description`)
  - Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`
  - Render `<TopicCard>` for each filtered topic; pass `isSelected`, `onClick` (set `selectedTopicId`)
  - Below grid: if `selectedTopicId` is set, render `<TopicStockList>` (inline, not modal)
  - If no filtered topics: show "無符合條件的題材" empty state

- [x] **Task 6**: Create `src/app/investment/topics/TopicStockList.tsx` (Client Component)
  - Props: `{ topic: TopicWithStats; onClose: () => void }`
  - Show topic name as header + close button (✕)
  - Table columns: 股票代號 | 股票名稱 | 收盤價 | 日漲跌
  - For each `stockCode` in `topic.stocks`: look up `topic.stockReturns[stockCode]`
  - If return data available: show `stock_name ?? stockCode`, `close ?? '--'`, `fmtPct(change_pct)` with `pctClass`
  - If no data: show stockCode only, "--" for price and return
  - Each stock row: `<Link href={/investment/stock/${stockCode}}>` on the stock code/name cell
  - Sort stocks by `change_pct` descending (nulls last)
  - Show stock count: "共 N 支成分股，M 支有資料"

### Phase 3: Navigation & Integration

- [x] [P] **Task 7**: Implement D5：SideNav 新增連結 — Update `src/components/layout/SideNav.tsx`
  - Find the existing `/investment/sectors` nav item
  - Add a new nav item immediately after it: `{ href: '/investment/topics', label: '產業題材', icon: Tag }` (import `Tag` from `lucide-react`)
  - Follow the exact same pattern as the existing sector nav item for className and active state

### Phase 4: Verify

- [x] **Task 8**: Verify build passes
  - Run `yarn build` and confirm no TypeScript errors
  - Confirm `topicMap.json` import resolves correctly (add `"resolveJsonModule": true` to `tsconfig.json` if missing)
  - Confirm `getTopicStockReturns` is only called from Server Components (not Client)
