"""
Check Trade Date Step

Pipeline 最前置步驟。查詢 etf_holdings_snapshot 的 max(data_date)，
若已等於 _last_weekday() 計算出的預期交易日，則設 ctx.skip_reason 並
raise EarlyExitSignal，讓 orchestrator 以 exit code 0 結束，
避免重複執行整個 pipeline 浪費 FinLab API 配額。
"""

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.signals import EarlyExitSignal
from ETF.pipeline.steps.base import BaseStep, StepDomain

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices


def _last_weekday() -> str:
    """回傳最近一個交易日的 YYYY-MM-DD 字串（台灣時間，15:00 前取前一交易日）。"""
    tw_now = datetime.now(timezone(timedelta(hours=8)))
    if tw_now.hour < 15:
        tw_now -= timedelta(days=1)
    d = tw_now.date()
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.isoformat()


class CheckTradeDateStep(BaseStep):
    """Pipeline 啟動前確認是否需要執行。

    查詢 etf_holdings_snapshot 的 max(data_date)：
    - NULL（首次執行）→ 繼續
    - 早於預期交易日 → 繼續
    - 等於預期交易日 → raise EarlyExitSignal（資料已是最新）
    DB 查詢失敗時 log warning 後繼續，不中斷 pipeline。
    """

    @property
    def name(self) -> str:
        return "Check Trade Date"

    @property
    def domain(self) -> StepDomain:
        # non-critical：DB 查詢失敗時繼續執行而非中斷
        return StepDomain.MARKET

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        expected_date = _last_weekday()

        try:
            from sqlalchemy import text
            with services.sql_storage.engine.connect() as conn:
                result = conn.execute(
                    text("SELECT MAX(data_date)::text FROM etf_holdings_snapshot")
                )
                row = result.fetchone()
                max_date = row[0] if row and row[0] is not None else None
        except Exception as e:
            self.logger.warning(
                f"Failed to query max data_date: {e}. Proceeding with pipeline."
            )
            return ctx

        self.logger.info(f"DB max data_date={max_date!r}, expected={expected_date!r}")

        if max_date is None:
            self.logger.info("No data in etf_holdings_snapshot (first run). Proceeding.")
            return ctx

        # Normalize: PostgreSQL may return date as string "2026-06-10"
        max_date_str = str(max_date)[:10]

        if max_date_str == expected_date:
            self.logger.info(
                f"Data already up to date for {expected_date}, skipping pipeline"
            )
            ctx.skip_reason = "data_up_to_date"
            raise EarlyExitSignal(f"data_up_to_date:{expected_date}")

        self.logger.info(
            f"Data needs updating: DB={max_date_str!r} < expected={expected_date!r}"
        )
        return ctx
