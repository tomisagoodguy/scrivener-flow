"""StrategySignalStep — 輔助步驟，執行所有策略並將訊號寫入 strategy_signals。

失敗時只 log，不中斷 pipeline（不 re-raise）。
"""

import logging
from typing import TYPE_CHECKING

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep
from ETF.strategies import ALL_STRATEGIES
from ETF.strategies.shared_cache import StrategyDataCache

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)


class StrategySignalStep(BaseStep):
    """執行所有策略並將當日訊號 upsert 至 strategy_signals（輔助步驟）。"""

    @property
    def name(self) -> str:
        return "Strategy Signal"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        date_str = ctx.date_str
        all_rows: list[dict] = []

        cache = StrategyDataCache()
        logger.info("[StrategySignalStep] 共用快取建立完成，開始執行策略")

        for strategy in ALL_STRATEGIES:
            try:
                positions = strategy.get_positions(cache=cache)
                if positions is None or positions.empty:
                    logger.warning(f"[{strategy.strategy_id}] get_positions() returned empty")
                    continue

                latest_row = positions.iloc[-1]
                latest_date = positions.index[-1]
                date_key = latest_date.strftime("%Y-%m-%d") if hasattr(latest_date, "strftime") else str(latest_date)

                rows = []
                for stock_id, value in latest_row.items():
                    is_selected = bool(value) if value else False
                    if not is_selected:
                        continue
                    score = float(value) if value is not None else None
                    rows.append({
                        "strategy_id": strategy.strategy_id,
                        "date": date_key,
                        "stock_id": str(stock_id),
                        "score": score,
                        "is_selected": True,
                        "conditions": None,
                    })

                logger.info(f"[{strategy.strategy_id}] {len(rows)} stocks selected on {date_key}")
                all_rows.extend(rows)

            except Exception as e:
                logger.error(f"[{strategy.strategy_id}] get_positions() failed: {e}")

        if all_rows:
            services.sql_storage.upsert_strategy_signals(all_rows)

        return ctx
