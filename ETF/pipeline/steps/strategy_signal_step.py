"""StrategySignalStep — 輔助步驟，執行所有策略並將訊號寫入 strategy_signals。

失敗時只 log，不中斷 pipeline（不 re-raise）。
"""

import logging
from datetime import date, datetime
from typing import TYPE_CHECKING

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep
from ETF.strategies import ALL_STRATEGIES
from ETF.strategies.shared_cache import StrategyDataCache

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

# 連續停更升級告警門檻（日曆天）。超過此天數未成功寫入即發出告警。
STALENESS_THRESHOLD_DAYS = 3
# FundMomentumStep 產生、非本步驟系列策略，停更檢查時排除。
_EXCLUDED_STRATEGY_ID = "fund_momentum"


class StrategySignalStep(BaseStep):
    """執行所有策略並將當日訊號 upsert 至 strategy_signals（輔助步驟）。"""

    @property
    def name(self) -> str:
        return "Strategy Signal"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            from finlab.exceptions import DataError as FinlabDataError
        except ImportError:
            FinlabDataError = None  # type: ignore[assignment,misc]

        date_str = ctx.date_str
        all_rows: list[dict] = []
        outer_skipped = False

        try:
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

        except Exception as e:
            # 快取建立層級的例外（如配額耗盡）：不 early return，
            # 仍往下執行連續停更檢查，讓數週停更成為可見事件。
            outer_skipped = True
            if FinlabDataError is not None and isinstance(e, FinlabDataError):
                msg = "FinLab 配額耗盡，策略訊號本日 skip"
                logger.warning("[StrategySignalStep] FinLab quota exceeded, skipping strategy signals: %s", e)
                ctx.validation_warnings.append(msg)
            else:
                logger.error("[StrategySignalStep] Unexpected error: %s", e)

        if all_rows:
            services.sql_storage.upsert_strategy_signals(all_rows)

            new_codes = list({row["stock_id"] for row in all_rows} - set(ctx.secondary_stock_codes))
            if new_codes:
                ctx.secondary_stock_codes = ctx.secondary_stock_codes + new_codes
                logger.info(f"[StrategySignalStep] 新增 {len(new_codes)} 支策略股至 secondary_stock_codes")
        elif not outer_skipped:
            # 本次執行完畢但無任何輸出（策略全數回空或個別例外），且非快取層級 skip，
            # 視為當次全空告警，升級讓既有 LINE 通知管道一併通知管理員；維持不 raise。
            msg = f"策略訊號全空：{date_str} 所有現役策略皆無 is_selected 輸出"
            logger.warning("[StrategySignalStep] %s", msg)
            ctx.validation_warnings.append(msg)

        # 連續停更升級告警：不論本次寫入、skip 或例外，皆檢查系列策略在 DB 的最新成功日期。
        self._check_signal_staleness(ctx, services)

        return ctx

    def _check_signal_staleness(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        """檢查 StrategySignalStep 系列策略是否連續停更超過門檻，若是則升級為告警。

        與「當次全空」告警獨立，兩者可於同一次執行同時存在。檢查本身失敗只 log，不中斷。
        """
        try:
            series_ids = [
                s.strategy_id for s in ALL_STRATEGIES if s.strategy_id != _EXCLUDED_STRATEGY_ID
            ]
            latest = services.sql_storage.get_latest_strategy_signal_date(series_ids)
            if latest is None:
                return

            latest_date = latest if isinstance(latest, date) else datetime.strptime(str(latest)[:10], "%Y-%m-%d").date()
            stale_days = (self._today() - latest_date).days
            if stale_days > STALENESS_THRESHOLD_DAYS:
                msg = (
                    f"策略訊號已停更 {stale_days} 天"
                    f"（最後成功寫入日期 {latest_date.isoformat()}），"
                    "請檢查 FinLab 配額與 Pipeline 狀態"
                )
                logger.warning("[StrategySignalStep] %s", msg)
                ctx.validation_warnings.append(msg)
        except Exception as e:
            logger.error("[StrategySignalStep] 連續停更檢查失敗: %s", e)

    def _today(self) -> date:
        """回傳 server 當日日期（抽出以利測試 mock）。"""
        return date.today()
