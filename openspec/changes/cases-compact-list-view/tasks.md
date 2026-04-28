## 1. 新建緊湊清單元件

- [x] 1.1 建立 `src/components/features/cases/CaseMemoListView.tsx`
- [x] 1.2 實作 table 結構（案號、買賣方、里程碑進度、應注意備註）
- [x] 1.3 實作里程碑 badge 顏色（逾期/緊急/一般）
- [x] 1.4 實作備註截斷 + title tooltip

## 2. 整合進 CaseMemoBoard

- [x] 2.1 VIEW_TABS 新增 `{ value: 'list', label: '📋 緊湊清單' }`
- [x] 2.2 `filterByView` 對 `list` 回傳全部案件（等同 `all`）
- [x] 2.3 Board 主體新增 `view === 'list'` 分支，渲染 `CaseMemoListView`
- [x] 2.4 `list` tab 不顯示計數 badge
