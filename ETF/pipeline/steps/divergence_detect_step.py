"""分歧偵測步驟（輔助）

查詢當日 etf_diff_logs，找出同一股票同日有 ETF 買進（BUY/IN）
也有 ETF 賣出（SELL/OUT）的分歧標的，結果 upsert 至 etf_stock_divergence。

此步驟為輔助步驟：execute() 包在 try/except 中，失敗時 log error 不 re-raise。
"""
import json
import logging
from typing import TYPE_CHECKING

from sqlalchemy import text

from ETF.config.etf_registry import ETF_META
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

_BUY_TYPES = {"BUY", "IN"}
_SELL_TYPES = {"SELL", "OUT"}


class DivergenceDetectStep(BaseStep):
    """同日跨 ETF 分歧持股偵測，寫入 etf_stock_divergence"""

    @property
    def name(self) -> str:
        return "Divergence Detect"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"DivergenceDetectStep failed: {e}")
        return ctx

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        date_str = ctx.date_str
        if not date_str:
            self.logger.warning("No date_str in ctx, skipping divergence detection")
            return

        select_sql = text("""
            SELECT etf_code, stock_code, stock_name, change_type, diff_shares
            FROM etf_diff_logs
            WHERE data_date = CAST(:data_date AS date)
        """)

        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(select_sql, {"data_date": date_str}).fetchall()

        if not rows:
            self.logger.info(f"No diff_logs for {date_str}, skipping divergence detection")
            return

        # Group by stock_code; collect buy/sell ETF entries
        stock_map: dict[str, dict] = {}
        for row in rows:
            etf_code, stock_code, stock_name, change_type, diff_shares = row
            if stock_code not in stock_map:
                stock_map[stock_code] = {
                    "stock_name": stock_name or "",
                    "buys": [],
                    "sells": [],
                }

            meta = ETF_META.get(etf_code)
            fund_name = meta.name if meta else etf_code
            item = {
                "etfid": etf_code,
                "fund_name": fund_name,
                "diff_shares": int(diff_shares) if diff_shares is not None else 0,
            }

            if change_type in _BUY_TYPES:
                stock_map[stock_code]["buys"].append(item)
            elif change_type in _SELL_TYPES:
                stock_map[stock_code]["sells"].append(item)

        # Keep only stocks with both buying and selling ETFs on the same date
        divergent = [
            (code, data)
            for code, data in stock_map.items()
            if data["buys"] and data["sells"]
        ]

        if not divergent:
            self.logger.info(f"No divergent stocks found for {date_str}")
            return

        records = [
            {
                "data_date": date_str,
                "stock_code": code,
                "stock_name": data["stock_name"],
                "buy_etfs": json.dumps(data["buys"], ensure_ascii=False),
                "sell_etfs": json.dumps(data["sells"], ensure_ascii=False),
                "buy_count": len(data["buys"]),
                "sell_count": len(data["sells"]),
            }
            for code, data in divergent
        ]

        upsert_sql = text("""
            INSERT INTO etf_stock_divergence
                (data_date, stock_code, stock_name, buy_etfs, sell_etfs, buy_count, sell_count)
            VALUES
                (:data_date, :stock_code, :stock_name,
                 CAST(:buy_etfs AS jsonb), CAST(:sell_etfs AS jsonb),
                 :buy_count, :sell_count)
            ON CONFLICT (data_date, stock_code) DO UPDATE SET
                stock_name = EXCLUDED.stock_name,
                buy_etfs   = EXCLUDED.buy_etfs,
                sell_etfs  = EXCLUDED.sell_etfs,
                buy_count  = EXCLUDED.buy_count,
                sell_count = EXCLUDED.sell_count
        """)

        with services.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, records)
            conn.commit()

        self.logger.info(
            f"Divergence detection done: {len(records)} divergent stocks on {date_str}"
        )
