"""
Save Snapshot Step

負責儲存快照、異動記錄與 CSV 備份。
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices


class SaveSnapshotStep(BaseStep):
    """儲存快照與異動記錄"""
    
    @property
    def name(self) -> str:
        return "Save Snapshot"
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        if ctx.df is None:
            raise ValueError("No DataFrame available for saving")
        
        storage = services.storage
        
        # 儲存異動記錄（使用 SQLAlchemy upsert，避免 REST API 409 衝突）
        if ctx.diff_logs:
            services.sql_storage.save_diff_logs(ctx.diff_logs)
            storage.update_holding_periods(ctx.diff_logs)
            self.logger.info(f"Saved {len(ctx.diff_logs)} diff logs.")
        
        # 儲存快照
        storage.save_snapshot(ctx.df, ctx.etf_code, ctx.date_str)
        self.logger.info("Snapshot updated successfully.")
        
        # 儲存 CSV 備份
        self._save_csv_archive(ctx)
        
        return ctx
    
    def _save_csv_archive(self, ctx: PipelineContext):
        """儲存 CSV 歷史備份"""
        try:
            csv_filename = f"{ctx.etf_code}_{ctx.date_str}.csv"
            csv_path = ctx.output_dir / csv_filename
            ctx.df.to_csv(csv_path, index=False, encoding='utf-8-sig')
            self.logger.info(f"Saved CSV archive: {csv_path}")
        except Exception as e:
            self.logger.error(f"Error saving CSV: {e}")
