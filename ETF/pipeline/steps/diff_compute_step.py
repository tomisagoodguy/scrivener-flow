"""
Diff Compute Step

負責計算持股異動（新增/剔除/增減）。
"""

from .base import BaseStep
from ETF.pipeline.context import PipelineContext


class DiffComputeStep(BaseStep):
    """計算持股異動"""
    
    @property
    def name(self) -> str:
        return "Compute Diff"
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        from ETF.processors.diff_engine import compute_diff
        
        if ctx.df is None:
            raise ValueError("No DataFrame available for diff computation")
        
        # 取得前一次快照（5天前或最新）
        prev_df = ctx.storage.get_snapshot_days_ago(ctx.etf_code, days_ago=5)
        
        if prev_df.empty:
            self.logger.info("No 5-day history found, falling back to latest snapshot.")
            prev_df = ctx.storage.get_latest_snapshot(ctx.etf_code)
        
        # 計算異動
        ctx.diff_logs = compute_diff(prev_df, ctx.df, ctx.etf_code, ctx.date_str)
        
        if ctx.diff_logs:
            self.logger.info(f"Found {len(ctx.diff_logs)} diff events.")
        else:
            self.logger.info("No significant changes found.")
        
        return ctx
