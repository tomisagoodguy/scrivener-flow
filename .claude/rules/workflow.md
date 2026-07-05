# 開發流程規則

> ⚠️ **現行流程是 Spectra（`/spectra-*`），非 openspec。** 本專案已從 openspec 遷移到 Spectra（見專案 CLAUDE.md 頂部「Spectra Instructions」）。下方 openspec 指令為**歷史遺留**，對照使用：
> `openspec new change` → `/spectra-propose`；`openspec apply` → `/spectra-apply`；archive → `/spectra-archive`。`openspec/specs/` 與 `openspec/changes/` 目錄名沿用，但指令一律走 Spectra。

## 功能變更：必須走結構化 SDD 流程（現為 Spectra）

**所有功能開發 / 修改必須走 SDD 流程**，禁止直接用 `/plan`。（以下 openspec 指令為歷史參考，實際用上方 Spectra 對照。）

```bash
openspec new change "<name>"                         # 建立新 change
openspec status --change "<name>"                    # 查看 artifact 進度
openspec instructions <artifact> --change "<name>"   # 取得撰寫指引
openspec apply --change "<name>"                     # 開始執行 tasks
```

Change 目錄：`openspec/changes/<name>/`
Artifact 順序：`proposal → design → specs → tasks`
進度追蹤：`tasks.md` 用 checkbox

## 登入與認證行為

| 情境 | 正確處理 |
|------|---------|
| localhost 登入後無限重導 `/login` | 已登入仍 404 → 直接訪問 `/cases` 或 `/dashboard`，不要重試 `/login` |
| 遇到 `/login` 重導向 | **停止重試**，告知使用者需在瀏覽器手動登入 |
| Google Auth 在 Production 失敗 | Supabase Dashboard → Authentication → Redirect URLs 加入 `https://<your-domain>/**` |

根頁面 `/` 無 session 時自動跳轉 `/login` 是正常行為。

## 套件管理

| ❌ 禁止 | ✅ 正確 |
|---------|--------|
| `npm install` | `yarn add` |
| `pip install` | `uv add` |
| 建立 `_v2.ts` 備份檔 | 直接修改原檔，版本交 git 管理 |
