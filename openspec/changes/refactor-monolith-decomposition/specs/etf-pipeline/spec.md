# Spec: ETF Pipeline Modularization

## ADDED Requirements

### Req: Pipeline Context Data Passing

Pipeline 執行過程中，各步驟應透過統一的 Context 物件傳遞狀態。

- #### Scenario: Context Initialization

  - **Given** 使用者執行 ETF 追蹤器 main.py。
  - **When** Pipeline 初始化時。
  - **Then** 應建立 PipelineContext 包含 df、date_str、etf_code、diff_logs、args 等屬性。

- #### Scenario: Context Passing Between Steps

  - **Given** ScrapeStep 執行完成並更新 ctx.df。
  - **When** PriceAttachStep 接收 Context。
  - **Then** Context 應包含 ScrapeStep 更新的 df 與 date_str。

### Req: Step Independent Execution

每個 Pipeline Step 應可獨立執行，不依賴 main.py 的控制流程。

- #### Scenario: ScrapeStep Unit Test

  - **Given** 已 mock FhTrustScraper。
  - **When** 執行 ScrapeStep().execute(ctx)。
  - **Then** 應回傳更新後的 Context 包含抓取的 DataFrame。

- #### Scenario: DryRun Mode Skip Save

  - **Given** PipelineContext.is_dry_run 設為 True。
  - **When** 執行 SaveSnapshotStep。
  - **Then** 步驟應跳過實際儲存並記錄 log。

### Req: Pipeline Orchestrator Coordination

Orchestrator 負責依序執行所有 Step 並處理錯誤。

- #### Scenario: Normal Execution Flow

  - **Given** 所有 Step 都正常執行。
  - **When** Orchestrator.run(ctx) 被調用。
  - **Then** 應依序執行 ScrapeStep、PriceAttachStep、DiffComputeStep、SaveSnapshotStep、SyncOHLCVStep、NotifyStep、CleanupStep。

- #### Scenario: Step Failure Handling

  - **Given** ScrapeStep 回傳空 DataFrame。
  - **When** 後續步驟嘗試執行。
  - **Then** Orchestrator 應中斷 Pipeline 並記錄錯誤。

## MODIFIED Requirements

### Req: Simplify main.py Entry Point

main.py 應從目前的 207 行精簡為小於 50 行的 Entry Point。

- #### Scenario: Simplified Structure

  - **Given** 重構完成的 main.py。
  - **When** 檢視檔案內容。
  - **Then** 應只包含 argparse 定義、環境變數檢查、PipelineContext 初始化、PipelineOrchestrator 調用。

## REMOVED Requirements

### Req: Remove Inline Business Logic

main() 函數不應再包含直接的業務邏輯實作。

- #### Scenario: Business Logic Moved to Steps

  - **Given** 現有 main.py 包含 Scraper 調用和 Storage 儲存等邏輯。
  - **When** 重構完成。
  - **Then** 這些邏輯應全部移至對應的 Step classes。
