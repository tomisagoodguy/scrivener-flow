## Why

備忘錄卡片模式（grid）在案件數超過 8 件時需大量滾動，且卡片高度不一致導致視線難以橫向掃描；代書需要一眼看完全部案件的里程碑進度與應注意事項。

## What Changes

- 新增備忘錄板的「緊湊清單」子 view（`view=list`）
- 現有卡片模式（`view=all`/`notes`/`pending`/`private`）完全保留
- VIEW_TABS 新增一個 `📋 緊湊清單` 選項

## Capabilities

### New Capabilities
- `memo-compact-list`: 備忘錄板新增緊湊列表 view，每列一案件，固定行高，顯示案號、買賣方、里程碑進度、應注意備註摘要（截斷 + hover 展開）

### Modified Capabilities
- `memo-board-tabs`: VIEW_TABS 新增 `list` 選項

## Impact

- `src/components/features/cases/CaseMemoBoard.tsx` — 新增 list view 分支
- 新建 `src/components/features/cases/CaseMemoListView.tsx` — 緊湊清單元件
- `src/app/cases/page.tsx` — 無需修改（view param 已透傳）
