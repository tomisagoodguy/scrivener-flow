"""
Diff Compute Step

負責計算持股異動（新增/剔除/增減）。
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from ETF.processors.diff_engine import compute_diff, filter_significant
import pandas as pd


class DiffComputeStep(BaseStep):
    """計算持股異動"""

    @property
    def name(self) -> str:
        return "Compute Diff"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.df is None:
            raise ValueError("No DataFrame available for diff computation")
        
        # 1. Determine which previous snapshot to compare against
        # We generally want the LATEST snapshot (index 0).
        # But if we are re-running today's pipeline, the "latest" in DB might already be TODAY.
        # In that case, we want the 2nd latest (index 1).
        
        target_df = pd.DataFrame()
        latest_date_in_db = None

        try:
            # Check latest date available in DB
            latest_date_in_db = ctx.storage.get_latest_date(ctx.etf_code)

            if latest_date_in_db == ctx.date_str:
                self.logger.info(f"Latest DB snapshot is already today ({latest_date_in_db}). Comparing against previous day (Index 1).")
                # Fetch index 1 (2nd latest)
                target_df = ctx.storage.get_snapshot_by_index(ctx.etf_code, index=1)
            else:
                self.logger.info(f"Comparing against latest DB snapshot: {latest_date_in_db}")
                target_df = ctx.storage.get_snapshot_from_date(ctx.etf_code, latest_date_in_db)

        except Exception as e:
            self.logger.warning(f"Could not intelligently determine snapshot date: {e}. Falling back to simple latest fetch.")
            target_df = ctx.storage.get_latest_snapshot(ctx.etf_code)

        prev_df = target_df

        if prev_df.empty:
            if latest_date_in_db is None:
                # 真正的首次執行，允許全部 IN 信號
                self.logger.info("First run detected (no previous snapshot). All holdings will be marked as IN.")
            else:
                # 有歷史但取不到前日快照（例如重複執行且 DB 只有今日 1 筆）
                self.logger.warning(
                    "Previous snapshot is empty despite having DB history "
                    f"(latest_date={latest_date_in_db}). Skipping diff to prevent false IN signals."
                )
                ctx.diff_logs = []
                return ctx

        
        # 計算異動（含 CLOSE 判定、0.10% 閾值過濾）
        all_logs = compute_diff(prev_df, ctx.df, ctx.etf_code, ctx.date_str)
        ctx.diff_logs = all_logs  # 保留全部（含 TRIM）供後續分析

        significant = filter_significant(all_logs)
        trim_count = len(all_logs) - len(significant)

        if significant:
            self.logger.info(
                f"Found {len(all_logs)} diff events "
                f"({len(significant)} significant, {trim_count} minor trims suppressed)."
            )
        else:
            self.logger.info("No significant changes found.")
        
        return ctx
