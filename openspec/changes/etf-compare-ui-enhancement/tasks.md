## 1. compare/page.tsx 修正

- [x] 1.1 將日期格式從 `{ month: '2-digit', day: '2-digit' }` 改為 `{ year: 'numeric', month: '2-digit', day: '2-digit' }`

## 2. EtfComparePanel - 交集說明截斷

- [x] 2.1 新增 `truncateList(list: string[], max: number)` helper，回傳 `{ shown: string[], remaining: number }`
- [x] 2.2 將 `overlap.all3.join('、')` 改用 truncateList，超過5支時附加 `+N 支` 文字
- [x] 2.3 將 `overlap.any2.join('、')` 同樣改用 truncateList

## 3. EtfComparePanel - OverlapSummary 摘要卡

- [x] 3.1 新增 `OverlapSummary` function component，接受 `{ all3Count, any2Count, top10Count }` props
- [x] 3.2 計算三方 / 兩方佔前10大持股的百分比並顯示
- [x] 3.3 在 EtfComparePanel return 中，將 OverlapSummary 插入交集說明區塊之前
- [x] 3.4 無重疊時顯示「前10大持股無重疊」

## 4. EtfCard - 持股展開/收合

- [x] 4.1 在 EtfCard 加入 `const [expanded, setExpanded] = useState(false)`
- [x] 4.2 持股顯示改為 `expanded ? etf.holdings : etf.holdings.slice(0, 10)`
- [x] 4.3 當 `etf.holdings.length > 10` 時，在表格下方渲染展開/收合按鈕
- [x] 4.4 按鈕文字：收合時顯示「顯示全部 N 筆 ▼」，展開時顯示「收合 ▲」

## 5. EtfCard - 交集列高亮強化

- [x] 5.1 移除既有的 `ring-1 ring-inset ring-yellow-400 / ring-blue-400` 樣式
- [x] 5.2 三方共同持股列改為 `bg-yellow-50/80 dark:bg-yellow-900/30`
- [x] 5.3 兩方共同持股列改為 `bg-blue-50/80 dark:bg-blue-900/30`
- [x] 5.4 badge 字體改為 `text-xs font-semibold`，加深文字顏色對比
