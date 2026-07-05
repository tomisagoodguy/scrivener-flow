# 治理檔維護協議（交付 F）

> **on-demand**：要新增/修改任何治理檔或 CLAUDE.md／rules 時才 Read。
> 目的：讓未來較弱的模型能**安全地**更新這套制度，而不是愈改愈亂、愈改愈長。
> 核心風險：弱模型傾向「只增不刪」「複製而非延伸」「把 session 專屬瑣事當通則寫進去」。這份就是防這個。

---

## 0. 這套制度有哪些檔（改之前先認清地圖）

| 檔 | 層級 | 何時載入 | 內容 |
|----|------|---------|------|
| `CLAUDE.md`（專案） | always-on | 每 session | 三大原則、技術棧、目錄、指向 rules 的索引 |
| `.claude/rules/*.md` | always-on | 每 session | 高頻操作規則 + 高頻 trap（含 model-dispatch、judgment-rubrics） |
| `.claude/governance/*.md` | on-demand | 用時 Read | 診斷、範本、本協議、給未來的信 |
| `~/.claude/CLAUDE.md`（global） | always-on | 每 session（跨專案） | 跨專案通則 + 濃縮版調度/判斷守則 |
| `.claude/backups/` | 不載入、不進 git | — | 改動前的備份副本 |

**單一事實來源鐵律**：一個概念只在一個檔完整說明，其他地方只留「一句話 + 指向」。改動時若發現同一事實在兩處 → 合併到一處。

---

## 1. 可自行改 vs 動前先問使用者

### ✅ 可自行改（不需問，但要遵守下面格式與驗證）
- 修正**明確的錯誤**：過時的模型 ID、失效的路徑/檔名、跑不動的指令、前後矛盾的規則。
- **新增一條 trap** 到對應 rules 檔（附證據：哪個 case 踩到、怎麼修）。
- 把**重複內容**收斂到單一來源（刪掉複製的那份，改成指向）。
- 更新 `MEMORY.md` 索引與 `memory/*.md`（照 memory 既有格式）。

### 🛑 動前先問使用者（難回復 / 屬使用者決策）
- **刪整個檔** 或**大段刪 trap**（那些是心血；本次交付 B 就被要求「只去重不刪 trap」）。
- 改 **global `~/.claude/CLAUDE.md`**（影響所有專案）。
- 精簡 **permission allow 清單**（會移除現有授權，難回復）。
- 關閉**全域 MCP 連接器 / skill**（帳號層級，影響其他 session）。
- 改動 CLAUDE.md 中**明確標「禁止改動」**的規則（如 `/cases` 預設排序、台股色彩慣例）。

**判準**：「這動作出錯了，我 5 分鐘內能不能無痛還原？」能 → 可自行改；不能 → 先問。

---

## 2. 踩坑後，教訓寫回哪裡（格式）

發生「做錯被糾正」或「踩到非顯而易見的坑」時：

1. **判斷歸屬**：
   - 本專案領域 trap（DB/元件/ETF/AI/深色模式/流程）→ 對應 `.claude/rules/*.md`。
   - 模型調度/判斷力問題 → `model-dispatch.md` 或 `judgment-rubrics.md`。
   - 使用者偏好/工作哲學 → `memory/*.md`（照 memory frontmatter 格式）。
2. **格式**（trap 一律這三段，缺一不可）：
   ```
   ### <一句話標題：現象或規則>
   **現象/情境**：〔什麼情況會踩到，具體〕
   **原因**：〔為什麼〕
   **正確做法**：〔可執行的步驟或程式碼，附正例/反例〕
   ```
3. **禁止**：只寫「要小心 X」這種抽象話（對弱模型等於沒寫）。必須給判準、指令或程式碼。
4. **不要**把只在這次 session 有意義的東西寫成通則（見 §4 判準）。

**正例**：「cp950 讀 UTF-8 檔會爆 → 一律 `encoding='utf-8'`」＋指令 → 寫進 judgment-rubrics F 節。
**反例**：「今天改 page.tsx 時要記得存檔」→ session 專屬，不寫。

---

## 3. 什麼該寫、什麼不該寫（避免膨脹）

**該寫**（非顯而易見、跨 session 有用）：
- 反直覺的行為（JOIN 回陣列、diff_shares 單位、紅漲綠跌）。
- 會重複踩的環境坑（編碼、雙 shell、過時模型 ID）。
- 使用者明確表達的偏好與禁令。

**不該寫**（repo 已記錄 or 只此一次）：
- 程式碼結構、git history 能查到的（別複述）。
- 這次任務專屬、下次用不到的細節。
- 「保持高品質」這類無法執行的抽象要求。

被要求「記住某件 repo 已記錄的事」時 → 反問「這件事**非顯而易見**的點是什麼」，只記那個點。

---

## 4. 多長要精簡（防無限增長）

always-on 檔有硬上限，**超過就精簡或下沉到 on-demand**：

| 檔 | 軟上限 | 超過怎麼辦 |
|----|-------|-----------|
| `.claude/rules/` 單檔 | ~200 行 | 把「特定情境才用」的段落移到 `.claude/governance/`，rules 檔留指向 |
| `.claude/rules/` 總量 | ~8 個檔 | 合併同主題檔；砍過時 trap（先問使用者） |
| 專案 CLAUDE.md | ~340 行 | 領域細節下沉到 rules，主檔只留原則+索引 |

精簡的判準（§ harness-diagnosis 一.2）：**「這條規則，新 session 平均每 3 次會用到 1 次以上嗎？」** 否 → 移到 on-demand。

**每季或每次覺得「載入變慢/變雜」時**：Read harness-diagnosis，重跑 `wc -c CLAUDE.md .claude/rules/*.md`，若總量比上次成長 >30% 就做一輪精簡。

---

## 5. 改完必做（否則等於沒改）

1. 改 always-on 檔（CLAUDE.md/rules）後 → 派 **fresh-context agent read-back**：確認落地、完整、與其他檔無矛盾（見 model-dispatch §6）。
2. 有備份需求的既有檔，改前先 `cp` 到 `.claude/backups/`（已 gitignore）。
3. 治理檔的改動要 commit（在 git 內），commit message 用 `docs(governance): …`。
4. 若改動了「檔案地圖」（新增/移除治理檔）→ 同步更新本協議 §0 的表 **和** CLAUDE.md 的索引。
