"""
Overlap Compute Step

從 etf_holdings_snapshot 聚合當日快照，計算各股票的共識分數：
- etf_count: 持有此股的 ETF 數量
- total_weight: 各 ETF 權重合計
- etf_list: JSONB 陣列，含各 ETF 代碼與權重

結果 upsert 至 etf_stock_overlap（冪等）。
"""

import json
import logging
from sqlalchemy import text

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.processors.diff_engine import CONSENSUS_WEIGHT_THRESHOLD

logger = logging.getLogger(__name__)


class OverlapComputeStep(BaseStep):
    """計算跨 ETF 共識持股並寫入 etf_stock_overlap"""

    @property
    def name(self) -> str:
        return "ETF Overlap Compute"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        # 使用最新快照的實際日期（而非系統日期），避免非交易日跳過
        latest_date_sql = text("""
            SELECT MAX(data_date) FROM etf_holdings_snapshot
        """)
        with services.sql_storage.engine.connect() as conn:
            result = conn.execute(latest_date_sql).scalar()

        if not result:
            self.logger.warning("No holdings snapshot found in DB, skipping overlap compute")
            return ctx

        target_date = str(result)
        self.logger.info(f"Computing overlap for latest snapshot date: {target_date}")

        # 取出該日所有 ETF 快照
        select_sql = text("""
            SELECT etf_code, stock_code, weight
            FROM etf_holdings_snapshot
            WHERE data_date = :data_date
              AND weight > 0
        """)

        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(select_sql, {"data_date": target_date}).fetchall()

        if not rows:
            self.logger.warning(f"No holdings snapshot found for {target_date}, skipping overlap compute")
            return ctx

        # 按 stock_code 聚合
        stock_data: dict[str, dict] = {}
        for row in rows:
            etf_code, stock_code, weight = row
            if stock_code not in stock_data:
                stock_data[stock_code] = {"etf_list": [], "total_weight": 0.0}
            stock_data[stock_code]["etf_list"].append({"etf_code": etf_code, "weight": float(weight)})
            stock_data[stock_code]["total_weight"] += float(weight)

        records = [
            {
                "stock_code": stock_code,
                "data_date": target_date,
                "etf_count": len(data["etf_list"]),
                "total_weight": round(data["total_weight"], 4),
                "etf_list": json.dumps(data["etf_list"], ensure_ascii=False),
            }
            for stock_code, data in stock_data.items()
        ]

        upsert_sql = text("""
            INSERT INTO etf_stock_overlap
                (stock_code, data_date, etf_count, total_weight, etf_list)
            VALUES
                (:stock_code, :data_date, :etf_count, :total_weight, CAST(:etf_list AS jsonb))
            ON CONFLICT (stock_code, data_date) DO UPDATE SET
                etf_count    = EXCLUDED.etf_count,
                total_weight = EXCLUDED.total_weight,
                etf_list     = EXCLUDED.etf_list,
                updated_at   = NOW()
        """)

        with services.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, records)
            conn.commit()

        etf_count = len({row[0] for row in rows})
        self.logger.info(
            f"Overlap compute done: {len(records)} stocks from {etf_count} ETFs on {target_date}"
        )

        # 計算共識加減碼計數（最近 7 個自然日）
        self._update_consensus_counts(ctx, target_date, services)

        return ctx

    def _update_consensus_counts(self, ctx: PipelineContext, target_date: str, services: "PipelineServices") -> None:
        """
        查詢最近 7 個自然日的 etf_diff_logs，按 stock_code 統計：
        - consensus_buy_count: BUY/IN 且 abs(diff_weight) >= CONSENSUS_WEIGHT_THRESHOLD 的 ETF 支數
        - consensus_sell_count: SELL/OUT 且 abs(diff_weight) >= CONSENSUS_WEIGHT_THRESHOLD 的 ETF 支數
        結果 upsert 至 etf_stock_overlap 對應的 target_date row。
        """
        consensus_sql = text("""
            WITH consensus AS (
                SELECT
                    stock_code,
                    COUNT(DISTINCT CASE
                        WHEN change_type IN ('BUY', 'IN')
                             AND ABS(diff_weight) >= :threshold
                        THEN etf_code
                    END) AS buy_count,
                    COUNT(DISTINCT CASE
                        WHEN change_type IN ('SELL', 'OUT')
                             AND ABS(diff_weight) >= :threshold
                        THEN etf_code
                    END) AS sell_count
                FROM etf_diff_logs
                WHERE data_date >= CAST(:target_date AS date) - INTERVAL '7 days'
                  AND data_date <= CAST(:target_date AS date)
                GROUP BY stock_code
            )
            UPDATE etf_stock_overlap o
            SET
                consensus_buy_count  = c.buy_count,
                consensus_sell_count = c.sell_count,
                updated_at           = NOW()
            FROM consensus c
            WHERE o.stock_code = c.stock_code
              AND o.data_date = CAST(:target_date AS date)
        """)

        with services.sql_storage.engine.connect() as conn:
            result = conn.execute(
                consensus_sql,
                {"target_date": target_date, "threshold": CONSENSUS_WEIGHT_THRESHOLD},
            )
            conn.commit()

        self.logger.info(
            f"Consensus counts updated for {target_date}: "
            f"{result.rowcount} rows affected (threshold={CONSENSUS_WEIGHT_THRESHOLD}pp, window=7d)"
        )
