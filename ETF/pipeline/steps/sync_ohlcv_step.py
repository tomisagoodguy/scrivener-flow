"""
Sync OHLCV Step

負責同步歷史 K 線資料（用於圖表）。
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext


class SyncOHLCVStep(BaseStep):
    """同步歷史 K 線資料"""
    
    @property
    def name(self) -> str:
        return "Sync OHLCV"
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.df is None:
            raise ValueError("No DataFrame available for OHLCV sync")
        
        # 檢查是否為台股代碼
        numeric_codes = [
            c for c in ctx.df['code'].head(20).tolist() 
            if str(c).strip().isdigit()
        ]
        
        if len(numeric_codes) <= 10:
            self.logger.info("Skipping OHLCV sync for non-Taiwan stocks.")
            return ctx
        
        days = ctx.args.days if hasattr(ctx.args, 'days') else 250

        # 合併 00980A / 00991A 的成分股代碼
        all_codes = list(set(ctx.df['code'].tolist() + ctx.secondary_stock_codes))
        self.logger.info(f"Syncing historical OHLCV for charts ({days} days, {len(all_codes)} stocks)...")

        ohlcv_df = ctx.finlab_srv.get_ohlcv(all_codes, days=days)
        
        if not ohlcv_df.empty:
            ctx.storage.save_stock_prices(ohlcv_df)
            self.logger.info(f"OHLCV sync completed. {len(ohlcv_df)} records.")
        else:
            self.logger.warning("No OHLCV data returned from Finlab.")
        
        return ctx
