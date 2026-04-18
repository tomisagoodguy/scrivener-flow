"""
Pipeline Orchestrator

負責依序執行所有 Pipeline 步驟並處理錯誤。
"""

import logging
from typing import List, Type

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.steps import (
    ScrapeStep,
    PriceAttachStep,
    DiffComputeStep,
    SaveSnapshotStep,
    SyncCompanyStep,
    SyncOHLCVStep,
    WeightHistoryStep,
    MultiEtfStep,
    OverlapComputeStep,
    SyncBareKStep,
    NotifyStep,
    CleanupStep,
)


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
        DiffComputeStep,
        SaveSnapshotStep,
        WeightHistoryStep,   # 快照存完後聚合排名→走勢表
        MultiEtfStep,        # 爬取 00980A / 00991A 持股、AUM、產業
        SyncCompanyStep,
        SyncOHLCVStep,
        OverlapComputeStep,  # 聚合跨 ETF 共識持股 → etf_stock_overlap
        SyncBareKStep,       # 同步 watch_list 裸K快照
        NotifyStep,
        CleanupStep,
    ]
    
    def __init__(self, steps: List[Type[BaseStep]] = None):
        """
        初始化編排器。
        
        Args:
            steps: 自訂步驟列表，預設使用 DEFAULT_STEPS
        """
        self.step_classes = steps or self.DEFAULT_STEPS
    
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

        current_step_name = "unknown"
        try:
            for step_class in self.step_classes:
                step = step_class()
                current_step_name = step.name
                ctx = step.run(ctx)

            logger.info("🎉 Pipeline completed successfully!")
            return ctx

        except Exception as e:
            logger.error(f"❌ Pipeline failed at [{current_step_name}]: {e}")
            self._send_error_alert(ctx, current_step_name, e)
            raise

    def _send_error_alert(self, ctx: PipelineContext, step_name: str, error: Exception) -> None:
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
            ctx.notifier.send_text(msg)
        except Exception as notify_err:
            logger.error(f"Failed to send error alert via LINE: {notify_err}")
    
    @classmethod
    def create_dry_run(cls) -> "PipelineOrchestrator":
        """建立 Dry Run 模式的編排器（只執行 Scrape）"""
        return cls(steps=[ScrapeStep])
