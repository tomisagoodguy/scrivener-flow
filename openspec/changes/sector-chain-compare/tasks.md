## 1. 實作供應鏈比對表元件

- [x] 1.1 在 `SectorTopicHeatmap.tsx` 新增 `ChainCompareTable` 子元件，接受 `topicId`、`currentTopic`、`allTopics`、`onSelect` props
- [x] 1.2 `ChainCompareTable` 利用 `getTopicChain(topicId)` 取得上下游 id 清單，並從 `allTopics` 解析為 `TopicWithStats[]`
- [x] 1.3 依序渲染「上游」列、「本題材」列（高亮）、「下游」列：顯示類型標籤、shortname、avgRet1d（色碼）、companyCount
- [x] 1.4 非本題材列點擊後呼叫 `onSelect(t.id)`；無上下游時不渲染元件

## 2. 替換原有標籤區

- [x] 2.1 將 `TopicDetailPanel` 裡的兩個 `<TopicChainBadge>` 替換為 `<ChainCompareTable>`
- [x] 2.2 移除已不再使用的 `TopicChainBadge` 元件
