"""StrategyTradeStep — 輔助步驟，推導各策略持有期間並寫入 strategy_trades。

讀 StrategySignalStep 存入 context 的 positions 完整歷史，以訊號日隔一個交易日的
開盤價計價、還原股價計算報酬。每天重算近 365 天（冪等 upsert），再刪過期列。
失敗時只 log，不中斷 pipeline（不 re-raise）。
"""

import logging
from datetime import date, timedelta
from typing import TYPE_CHECKING

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep
from ETF.processors.strategy_trades import derive_trade_episodes, price_trade_episodes
from ETF.strategies.shared_cache import StrategyDataCache

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

# 重算與保留的日曆天數
TRADE_LOOKBACK_DAYS = 365


def _run_date(ctx: PipelineContext) -> date:
    try:
        return date.fromisoformat(ctx.date_str)
    except ValueError:
        return date.today()


class StrategyTradeStep(BaseStep):
    """推導策略持有期間 → strategy_trades（輔助步驟）。"""

    @property
    def name(self) -> str:
        return "Strategy Trade"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run or not ctx.strategy_positions

    def execute(
        self, ctx: PipelineContext, services: "PipelineServices"
    ) -> PipelineContext:
        try:
            cache = ctx.strategy_data_cache or StrategyDataCache()
            open_, close, adj_close = cache.open_, cache.close, cache.adj_close
            since = _run_date(ctx) - timedelta(days=TRADE_LOOKBACK_DAYS)

            rows: list[dict] = []
            # 推導成功的策略 → 本次應存在的鍵；只清理這些策略，推導失敗者保留原紀錄
            keep_keys: dict[str, list[tuple[str, str]]] = {}
            for strategy_id, positions in ctx.strategy_positions.items():
                try:
                    episodes = derive_trade_episodes(positions, since)
                    priced = price_trade_episodes(episodes, open_, close, adj_close)
                    rows.extend({**row, "strategy_id": strategy_id} for row in priced)
                    keep_keys[strategy_id] = [(r["stock_id"], r["entry_signal_date"]) for r in priced]
                except Exception as e:
                    logger.warning("[StrategyTradeStep] %s 推導失敗，跳過: %s", strategy_id, e)

            services.sql_storage.upsert_strategy_trades(rows)
            # 策略邏輯改寫歷史後推導不出的舊列（含永遠 exit_date 為 null 的持有中列）一併刪除
            for strategy_id, keys in keep_keys.items():
                services.sql_storage.prune_strategy_trades(strategy_id, since.isoformat(), keys)
            deleted = services.sql_storage.delete_expired_strategy_trades(TRADE_LOOKBACK_DAYS)
            ctx.completed_artifacts["StrategyTrade"] = len(rows)
            logger.info(
                "[StrategyTradeStep] 寫入 %d 筆持有期間，刪除 %d 筆過期", len(rows), deleted
            )
        except Exception as e:
            logger.error("[StrategyTradeStep] 失敗: %s", e)

        return ctx
