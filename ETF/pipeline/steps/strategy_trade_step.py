"""StrategyTradeStep — 輔助步驟，推導各策略持有期間並寫入 strategy_trades。

讀 StrategySignalStep 存入 context 的 positions 完整歷史，以訊號日隔一個交易日的
開盤價計價、還原股價計算報酬。每天重算近 365 天（冪等 upsert），再刪過期列。
失敗時只 log，不中斷 pipeline（不 re-raise）。
"""

import logging
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

import pandas as pd

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


def persist_strategy_trades(
    positions_by_strategy: dict[str, pd.DataFrame],
    run_date: date,
    cache: StrategyDataCache,
    sql_storage: Any,
) -> int:
    """推導並計價各策略持有期間，upsert 後清理推導成功策略的舊列與過期列。

    單一策略推導失敗只記 warning 並保留其原紀錄；價格或 DB 例外向上拋，由呼叫端決定是否中斷。

    Args:
        positions_by_strategy: strategy_id → positions（index＝訊號日、columns＝股票代號）。
        run_date: 本次執行日，往前 TRADE_LOOKBACK_DAYS 天為重算窗口。
        cache: 提供 open_ / close / adj_close 的策略資料快取。
        sql_storage: 提供 upsert / prune / delete_expired 的儲存服務。

    Returns:
        寫入的持有期間筆數。
    """
    open_, close, adj_close = cache.open_, cache.close, cache.adj_close
    since = run_date - timedelta(days=TRADE_LOOKBACK_DAYS)

    rows: list[dict] = []
    # 推導成功的策略 → 本次應存在的鍵；只清理這些策略，推導失敗者保留原紀錄
    keep_keys: dict[str, list[tuple[str, str]]] = {}
    for strategy_id, positions in positions_by_strategy.items():
        try:
            episodes = derive_trade_episodes(positions, since)
            priced = price_trade_episodes(episodes, open_, close, adj_close)
            rows.extend({**row, "strategy_id": strategy_id} for row in priced)
            keep_keys[strategy_id] = [(r["stock_id"], r["entry_signal_date"]) for r in priced]
        except Exception as e:
            logger.warning("[StrategyTrade] %s 推導失敗，跳過: %s", strategy_id, e)

    sql_storage.upsert_strategy_trades(rows)
    # 策略邏輯改寫歷史後推導不出的舊列（含永遠 exit_date 為 null 的持有中列）一併刪除
    for strategy_id, keys in keep_keys.items():
        sql_storage.prune_strategy_trades(strategy_id, since.isoformat(), keys)
    deleted = sql_storage.delete_expired_strategy_trades(TRADE_LOOKBACK_DAYS)
    logger.info("[StrategyTrade] 寫入 %d 筆持有期間，刪除 %d 筆過期", len(rows), deleted)
    return len(rows)


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
            written = persist_strategy_trades(
                ctx.strategy_positions, _run_date(ctx), cache, services.sql_storage
            )
            ctx.completed_artifacts["StrategyTrade"] = written
        except Exception as e:
            logger.error("[StrategyTradeStep] 失敗: %s", e)

        return ctx
