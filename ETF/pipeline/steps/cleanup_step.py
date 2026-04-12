"""
Cleanup Step

負責清理過舊的資料庫記錄以節省空間。
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext


class CleanupStep(BaseStep):
    """清理過舊資料"""
    
    @property
    def name(self) -> str:
        return "Database Cleanup"
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        self.logger.info("Running database capacity cleanup...")
        
        ctx.sql_storage.cleanup_old_data()
        
        self.logger.info("Cleanup completed.")
        
        return ctx
