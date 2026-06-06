"""
Retail Sentiment Step

週頻集保股權分散資料（FinLab etl:inventory）→ 市場層級散戶參與指標。
計算 12 週變化、156 週滾動 Z-score，判斷人數加速與零股碎片化信號。
屬輔助步驟，失敗不中斷 pipeline。
"""

import logging
from typing import TYPE_CHECKING, Any

import pandas as pd
from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

_ROLLING_WINDOW = 156  # 近 3 年週數


def _compute_signals(
    sh_chg_12w: pd.Series,
    ol_median: pd.Series,
) -> dict[str, Any]:
    """
    從 12 週小戶變化序列與零股中位數序列計算最新一筆信號。

    Args:
        sh_chg_12w: 全市場中位數 12 週變化序列（週頻）
        ol_median:  全市場零股占比中位數序列（週頻）

    Returns:
        dict 含 small_holder_chg_12w、small_holder_z_score、
              is_retail_accelerating、is_odd_lot_fragmented
    """
    rolling_p90 = sh_chg_12w.rolling(_ROLLING_WINDOW).quantile(0.9)
    rolling_mean = sh_chg_12w.rolling(_ROLLING_WINDOW).mean()
    rolling_std = sh_chg_12w.rolling(_ROLLING_WINDOW).std()

    latest_chg = sh_chg_12w.iloc[-1]
    latest_p90 = rolling_p90.iloc[-1]
    latest_mean = rolling_mean.iloc[-1]
    latest_std = rolling_std.iloc[-1]

    if pd.isna(latest_std) or latest_std == 0:
        z_score = float("nan")
    else:
        z_score = float((latest_chg - latest_mean) / latest_std)

    ol_p90 = ol_median.rolling(_ROLLING_WINDOW).quantile(0.9).iloc[-1]
    ol_latest = ol_median.iloc[-1]

    return {
        "small_holder_chg_12w": float(latest_chg) if not pd.isna(latest_chg) else None,
        "small_holder_z_score": z_score if not (isinstance(z_score, float) and pd.isna(z_score)) else None,
        "is_retail_accelerating": bool(latest_chg > latest_p90) if not pd.isna(latest_p90) else False,
        "is_odd_lot_fragmented": bool(ol_latest > ol_p90) if not pd.isna(ol_p90) else False,
    }


class RetailSentimentStep(BaseStep):
    """週頻集保散戶指標，upsert 至 market_breadth_daily（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Retail Sentiment"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            logger.error(f"RetailSentimentStep failed: {e}")
            ctx.retail_sentiment = {}
        return ctx

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        import finlab.data as fd

        client = getattr(services.finlab_srv, "_client", None)
        if client and not client.login():
            logger.error("FinLab login failed, skipping RetailSentimentStep.")
            ctx.retail_sentiment = {}
            return

        logger.info("Fetching etl:inventory:小於十張佔比 and 零股佔比 ...")
        small_holder_df = fd.get("etl:inventory:小於十張佔比")
        odd_lot_df = fd.get("etl:inventory:零股佔比")

        if small_holder_df is None or small_holder_df.empty:
            logger.warning("small_holder data empty, skipping.")
            ctx.retail_sentiment = {}
            return
        if odd_lot_df is None or odd_lot_df.empty:
            logger.warning("odd_lot data empty, skipping.")
            ctx.retail_sentiment = {}
            return

        sh_median = small_holder_df.median(axis=1)
        ol_median = odd_lot_df.median(axis=1)

        sh_chg_12w = sh_median - sh_median.shift(12)
        sh_chg_12w = sh_chg_12w.dropna()

        if len(sh_chg_12w) < _ROLLING_WINDOW:
            logger.warning(f"Insufficient data ({len(sh_chg_12w)} weeks < {_ROLLING_WINDOW}), skipping.")
            ctx.retail_sentiment = {}
            return

        latest_inventory_date = str(sh_median.dropna().index[-1].date())
        logger.info(f"Latest inventory date: {latest_inventory_date}")

        signals = _compute_signals(sh_chg_12w, ol_median)
        ctx.retail_sentiment = {**signals, "date": latest_inventory_date}

        self._save(latest_inventory_date, signals, services)

    def _save(self, inventory_date: str, signals: dict, services: "PipelineServices") -> None:
        check_sql = text("""
            SELECT small_holder_chg_12w FROM market_breadth_daily
            WHERE date = :date AND small_holder_chg_12w IS NOT NULL
            LIMIT 1
        """)
        update_sql = text("""
            UPDATE market_breadth_daily SET
                small_holder_chg_12w   = :small_holder_chg_12w,
                small_holder_z_score   = :small_holder_z_score,
                is_retail_accelerating = :is_retail_accelerating,
                is_odd_lot_fragmented  = :is_odd_lot_fragmented
            WHERE date = :date
        """)
        try:
            with services.sql_storage.engine.connect() as conn:
                row = conn.execute(check_sql, {"date": inventory_date}).fetchone()
                if row is not None:
                    logger.info(f"Retail sentiment already persisted for {inventory_date}, skipping.")
                    return
                conn.execute(update_sql, {"date": inventory_date, **signals})
                conn.commit()
                logger.info(f"Retail sentiment saved for {inventory_date}: {signals}")
        except Exception as e:
            logger.error(f"Failed to save retail sentiment: {e}")
