"""
Shareholder Signal Step

從 Supabase equity_distribution_stats 表讀取大戶持股變化，
計算各持股的週度籌碼訊號，存入 ctx.shareholder_signals。
"""

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

ACCUMULATE_THRESHOLD = 0.1
REDUCE_THRESHOLD = -0.1


class ShareholderSignalStep(BaseStep):
    """從 equity_distribution_stats 讀取大戶籌碼週度變化訊號"""

    @property
    def name(self) -> str:
        return "Shareholder Signal"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run or ctx.df is None or ctx.df.empty

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        try:
            stock_codes = ctx.df["code"].tolist()
            signals: dict[str, str] = {}

            with ctx.sql_storage.engine.connect() as conn:
                rows = conn.execute(
                    text("""
                        SELECT DISTINCT ON (stock_code) stock_code, big_holder_pct_change
                        FROM equity_distribution_stats
                        WHERE stock_code = ANY(:codes)
                          AND big_holder_pct_change IS NOT NULL
                        ORDER BY stock_code, snapshot_date DESC
                    """),
                    {"codes": stock_codes},
                ).fetchall()

            for row in rows:
                code, delta = row[0], float(row[1])
                if delta > ACCUMULATE_THRESHOLD:
                    signals[code] = "積累"
                elif delta < REDUCE_THRESHOLD:
                    signals[code] = "減少"
                else:
                    signals[code] = "持平"

            ctx.shareholder_signals = signals
            accumulate_count = sum(1 for v in signals.values() if v == "積累")
            self.logger.info(
                f"💎 大戶籌碼訊號：{len(signals)}/{len(stock_codes)} 檔有資料，"
                f"積累 {accumulate_count} 檔"
            )
        except Exception as e:
            self.logger.error(f"ShareholderSignalStep failed: {e}")
            ctx.shareholder_signals = {}

        return ctx
