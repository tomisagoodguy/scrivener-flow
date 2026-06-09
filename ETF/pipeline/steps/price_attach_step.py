"""
Price Attach Step

負責附加股票價格與相關指標資料。
"""

from ETF.pipeline.steps.base import BaseStep, StepDomain
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices


class PriceAttachStep(BaseStep):
    """附加價格與指標資料"""

    @property
    def name(self) -> str:
        return "Attach Prices"

    @property
    def domain(self) -> StepDomain:
        return StepDomain.CORE
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        if ctx.df is None:
            raise ValueError("No DataFrame available for price attachment")
        
        # 檢查是否為台股代碼
        numeric_codes = [
            c for c in ctx.df['code'].head(20).tolist() 
            if str(c).strip().isdigit()
        ]
        
        if len(numeric_codes) > 10:
            self.logger.info("Detected Taiwan stocks. Fetching prices, amounts and margins...")
            ctx.df = services.finlab_srv.attach_prices(ctx.df, ctx.date_str)
        else:
            self.logger.info("Codes do not look like Taiwan stocks. Skipping Finlab price fetch.")
            ctx.df['price'] = None
            ctx.df['amount'] = None
            ctx.df['margin_ratio'] = 0
            ctx.df['currency'] = None
        
        return ctx
