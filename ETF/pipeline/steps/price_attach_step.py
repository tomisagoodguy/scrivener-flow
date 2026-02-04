"""
Price Attach Step

負責附加股票價格與相關指標資料。
"""

from .base import BaseStep
from ETF.pipeline.context import PipelineContext


class PriceAttachStep(BaseStep):
    """附加價格與指標資料"""
    
    @property
    def name(self) -> str:
        return "Attach Prices"
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.df is None:
            raise ValueError("No DataFrame available for price attachment")
        
        # 檢查是否為台股代碼
        numeric_codes = [
            c for c in ctx.df['code'].head(20).tolist() 
            if str(c).strip().isdigit()
        ]
        
        if len(numeric_codes) > 10:
            self.logger.info("Detected Taiwan stocks. Fetching prices, amounts and margins...")
            ctx.df = ctx.finlab_srv.attach_prices(ctx.df, ctx.date_str)
        else:
            self.logger.info("Codes do not look like Taiwan stocks. Skipping Finlab price fetch.")
            ctx.df['price'] = None
            ctx.df['amount'] = None
            ctx.df['margin_ratio'] = 0
            ctx.df['currency'] = None
        
        return ctx
