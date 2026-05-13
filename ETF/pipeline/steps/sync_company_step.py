"""
Sync Company Step

負責同步公司基本資訊（產業類別、公司名稱）。
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices


class SyncCompanyStep(BaseStep):
    """同步公司基本資訊"""
    
    @property
    def name(self) -> str:
        return "Sync Company Info"
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        if ctx.df is None:
            raise ValueError("No DataFrame available for company sync")
        
        self.logger.info("Syncing company basic info and industry categories...")
        
        company_df = services.finlab_srv.get_company_info(ctx.df['code'].tolist())
        
        if not company_df.empty:
            services.storage.save_company_info(company_df)
            self.logger.info(f"Company info sync completed. {len(company_df)} records.")
        else:
            self.logger.warning("No company info returned from Finlab.")
        
        return ctx
