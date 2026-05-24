"""
Pipeline Orchestrator

負責依序執行所有 Pipeline 步驟並處理錯誤。
"""

import logging
from typing import List, Optional, Type

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.steps import (
    ScrapeStep,
    PriceAttachStep,
    DiffComputeStep,
    SaveSnapshotStep,
    DisposalDetectStep,
    SyncCompanyStep,
    SyncOHLCVStep,
    WeightHistoryStep,
    MultiEtfStep,
    AumSyncStep,
    OverlapComputeStep,
    FlowComputeStep,
    SignalDetectStep,
    BuyingPatternStep,
    PositionSummaryStep,
    SyncBareKStep,
    ShareholderSignalStep,
    NewsContextStep,
    SyncTreemapStep,
    SyncAdlStep,
    NotifyStep,
    CleanupStep,
    FrontrunningStep,
    ActiveShareStep,
    CumulativeDragStep,
    MatchedPairsStep,
)
from ETF.pipeline.steps.strategy_signal_step import StrategySignalStep
from ETF.pipeline.steps.sector_strength_step import SectorStrengthStep
from ETF.pipeline.steps.data_validation_step import DataValidationStep


logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """
    Pipeline 編排器。
    
    負責依序執行所有步驟並處理錯誤。
    """
    
    # 預設步驟順序
    DEFAULT_STEPS: List[Type[BaseStep]] = [
        ScrapeStep,
        PriceAttachStep,
        DataValidationStep,
        DiffComputeStep,
        SaveSnapshotStep,
        DisposalDetectStep,     # [輔助] 偵測分時交易處置股，更新 is_disposal 欄位
        ShareholderSignalStep,  # 讀 stock-data-main JSON，計算大戶積累訊號
        WeightHistoryStep,      # 快照存完後聚合排名→走勢表
        MultiEtfStep,           # 爬取 00980A / 00991A 持股、AUM、產業
        AumSyncStep,            # 同步各 ETF AUM 時序 → etf_aum_series（輔助）
        SyncCompanyStep,
        SectorStrengthStep,     # [輔助] 計算全市場族群漲幅 → sector_strength；命中股加進 secondary_stock_codes
        StrategySignalStep,     # [輔助] 執行量化策略，upsert 訊號 → strategy_signals；策略股加進 secondary_stock_codes
        SyncOHLCVStep,          # 合併 ETF 持股 + sector + 策略股一起 sync K 線
        OverlapComputeStep,     # 聚合跨 ETF 共識持股 → etf_stock_overlap
        FlowComputeStep,        # 計算每日跨 ETF 資金流向 → etf_flow_daily（輔助）
        SignalDetectStep,       # 偵測跨 ETF 進階訊號 → etf_signals（輔助）
        BuyingPatternStep,      # 分類買進模式 + 補前瞻報酬 → etf_buying_patterns（輔助）
        PositionSummaryStep,    # 現金流法計算持倉損益 → etf_position_summary + etf_pnl_series（輔助）
        FrontrunningStep,       # [輔助] 揭露日異常成交量偵測 → etf_frontrunning_stats
        CumulativeDragStep,     # [輔助] 年化隱成本 → etf_cumulative_drag
        MatchedPairsStep,       # [輔助] 主動/被動配對實證 → etf_matched_pairs
        ActiveShareStep,        # [輔助] 持股重疊度（週一執行，非週一自動 skip）→ etf_active_share
        SyncBareKStep,          # 同步 watch_list 裸K快照
        NewsContextStep,        # 查 Cloudflare D1 取近期新聞供 AI 報告使用
        SyncTreemapStep,        # [輔助] 全市場個股快照 → market_treemap_daily
        SyncAdlStep,            # [輔助] 大盤騰落指標 → market_breadth_daily
        NotifyStep,
        CleanupStep,
    ]
    
    def __init__(self, steps: Optional[List[Type[BaseStep]]] = None):
        """
        初始化編排器。

        Args:
            steps: 自訂步驟列表，預設使用 DEFAULT_STEPS
        """
        self.step_classes = steps or self.DEFAULT_STEPS

    def _build_services(self, ctx: PipelineContext) -> PipelineServices:
        """初始化並回傳 PipelineServices（由 ctx 的環境變數驅動）"""
        import os
        from dotenv import load_dotenv
        from ETF.database.storage import ETFStorage
        from ETF.database.sql_storage import SQLStorage
        from ETF.notifiers.line_notifier import LineNotifier
        from ETF.services.finlab_service import FinlabService

        if os.path.exists('.env.local'):
            load_dotenv('.env.local')
        else:
            load_dotenv()

        storage = ETFStorage()
        sql_storage = SQLStorage()

        if os.getenv("STOCK_LINE_CHANNEL_ACCESS_TOKEN"):
            notifier = LineNotifier(
                token_env="STOCK_LINE_CHANNEL_ACCESS_TOKEN",
                user_id_env="STOCK_LINE_USER_ID",
            )
        else:
            notifier = LineNotifier()

        stock_list = ctx.df['code'].tolist() if ctx.df is not None else []
        finlab_srv = FinlabService(stock_list=stock_list)

        return PipelineServices(
            storage=storage,
            notifier=notifier,
            finlab_srv=finlab_srv,
            sql_storage=sql_storage,
        )
    
    def run(self, ctx: PipelineContext) -> PipelineContext:
        """
        執行 Pipeline。

        Args:
            ctx: Pipeline 上下文

        Returns:
            更新後的 PipelineContext
        """
        logger.info("🚀 Starting ETF Tracker Pipeline...")
        logger.info(f"   Steps: {len(self.step_classes)}")
        logger.info(f"   Dry Run: {ctx.is_dry_run}")

        services = self._build_services(ctx)
        current_step_name = "unknown"
        try:
            for step_class in self.step_classes:
                step = step_class()
                current_step_name = step.name
                ctx = step.run(ctx, services)

            logger.info("🎉 Pipeline completed successfully!")
            return ctx

        except Exception as e:
            logger.error(f"❌ Pipeline failed at [{current_step_name}]: {e}")
            self._send_error_alert(ctx, services, current_step_name, e)
            raise

    def _send_error_alert(
        self,
        ctx: PipelineContext,
        services: PipelineServices,
        step_name: str,
        error: Exception,
    ) -> None:
        """Pipeline 失敗時發 LINE 警報給管理員"""
        if ctx.is_dry_run:
            return
        try:
            from datetime import date
            msg = (
                f"🚨 ETF Pipeline 異常\n"
                f"📅 {date.today().isoformat()}\n"
                f"❌ 失敗步驟：{step_name}\n"
                f"💬 錯誤：{str(error)[:200]}\n\n"
                f"請至 GitHub Actions 查看完整 log。"
            )
            services.notifier.send_text(msg)
        except Exception as notify_err:
            logger.error(f"Failed to send error alert via LINE: {notify_err}")
    
    @classmethod
    def create_dry_run(cls) -> "PipelineOrchestrator":
        """建立 Dry Run 模式的編排器（只執行 Scrape）"""
        return cls(steps=[ScrapeStep])
