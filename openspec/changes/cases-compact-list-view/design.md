## Context

備忘錄板目前只有卡片 grid 模式，新建一個純 Server-rendered 的緊湊列表 view，不新增 API Route，只新增一個 Client Component 做互動（hover tooltip）。

## Goals / Non-Goals

**Goals:**
- 每列一案件，高度固定 ~56px，13 件一屏內可見
- 顯示：案號連結、買賣方、里程碑 badge（印/稅/過/交）、應注意備註摘要（截斷 + title tooltip）
- 整合進 VIEW_TABS，透過 `view=list` URL param 切換
- 保持與卡片模式相同的排序邏輯

**Non-Goals:**
- 行內編輯（緊湊模式只讀，點案號進詳情頁編輯）
- 分頁（沿用現有全量載入）

## Decisions

**新建 `CaseMemoListView.tsx`（非擴充 CaseMemoCard）**
卡片元件有大量編輯狀態與 tooltip 邏輯，緊湊列表完全不同的渲染結構，擴充會造成 props 爆炸。獨立元件更易維護。

**用 `<table>` 而非 flex 列表**
需要欄位對齊，table 比 flex div 更可靠。

**備註截斷用 CSS `truncate` + HTML `title` attribute**
不需要 JS tooltip 庫，輕量。

## Risks / Trade-offs

- [行高固定] → 超長備註只顯示第一行，需靠 title hover 看全文
- [只讀模式] → 用戶需點進詳情頁才能編輯，接受此取捨（目的是快速掃描）
