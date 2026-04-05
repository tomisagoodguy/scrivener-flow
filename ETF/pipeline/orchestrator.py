"""
Pipeline Orchestrator

負責依序執行所有 Pipeline 步驟並處理錯誤。
"""

import logging
from typing import List, Type

from .context import PipelineContext
from .steps.base import BaseStep
from .steps import (
    ScrapeStep,
    PriceAttachStep,
    DiffComputeStep,
    SaveSnapshotStep,
    SyncCompanyStep,
    SyncOHLCVStep,
    WeightHistoryStep,
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
        SyncCompanyStep,
        SyncOHLCVStep,
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
        
        try:
            for step_class in self.step_classes:
                step = step_class()
                ctx = step.run(ctx)
            
            logger.info("🎉 Pipeline completed successfully!")
            return ctx
            
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
            raise
    
    @classmethod
    def create_dry_run(cls) -> "PipelineOrchestrator":
        """建立 Dry Run 模式的編排器（只執行 Scrape）"""
        return cls(steps=[ScrapeStep])
