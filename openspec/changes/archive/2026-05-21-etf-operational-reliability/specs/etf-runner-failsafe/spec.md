# Spec: ETF Runner Failsafe

## Purpose

讓使用者在 GitHub 配額不足時，能不修改 YAML 就手動切換到 self-hosted runner（PCFIX8749），以及在需要時快速切回 ubuntu-latest。

---

## ADDED Requirements

### Requirement: etf_daily.yml 的 workflow_dispatch 支援 runner 選擇

`etf_daily.yml` SHALL 在 `workflow_dispatch` 輸入中新增 `runner` 參數，選項為 `ubuntu-latest`（預設）和 `self-hosted`。`run-tracker` 與 `validate-registry` job 的 `runs-on` SHALL 使用此參數。

#### Scenario: 手動觸發時選擇 self-hosted

- **WHEN** 使用者在 GitHub Actions UI 手動觸發 `etf_daily.yml`，並選擇 `runner: self-hosted`
- **THEN** `run-tracker` 和 `validate-registry` job 均在 PCFIX8749 上執行，不消耗 GitHub 配額

#### Scenario: 手動觸發時使用預設值

- **WHEN** 使用者手動觸發但不更改 `runner` 參數（保持預設 `ubuntu-latest`）
- **THEN** job 在 GitHub 雲端 runner 上執行，行為與 schedule 觸發一致

#### Scenario: 每日排程觸發

- **WHEN** cron schedule 觸發（`github.event.inputs.runner` 為空）
- **THEN** `runs-on` 的 `|| 'ubuntu-latest'` fallback 生效，使用 `ubuntu-latest`，不影響現有行為

---

### Requirement: 切換 runner 的前提條件說明文件

`ETF/CLAUDE.md` SHALL 在「CI/CD 已知陷阱」章節新增 self-hosted runner 切換的完整步驟說明，包含：切換時機、如何確認 runner 在線、切換後的注意事項（FinLab cache 路徑差異、Python 版本確認）。

#### Scenario: 查閱切換說明

- **WHEN** 使用者需要切換到 self-hosted runner
- **THEN** 可在 `ETF/CLAUDE.md` 找到完整步驟，不需查詢其他文件

---

### Requirement: self-hosted runner 的 FinLab cache 路徑兼容

當 `run-tracker` 在 self-hosted runner 執行時，FinLab cache 路徑 `~/.finlab` SHALL 在 Windows 環境下正確解析（`C:\Users\user\.finlab`），不因 OS 差異導致 cache miss 或寫入失敗。

#### Scenario: self-hosted runner 首次執行

- **WHEN** PCFIX8749 首次執行 `run-tracker` job
- **THEN** `mkdir -p ~/.finlab` 步驟在 Windows shell 下等效建立 `C:\Users\user\.finlab`，FinLab 資料正常快取

#### Scenario: GitHub Actions cache 在 self-hosted 不可用

- **WHEN** `actions/cache` 在 self-hosted runner 因路徑差異無法命中
- **THEN** FinLab 重新下載資料（降級為無 cache 行為），不報錯，pipeline 正常執行（僅速度較慢）
