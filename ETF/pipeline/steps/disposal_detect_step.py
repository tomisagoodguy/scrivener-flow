"""
DisposalDetectStep — 輔助步驟

每日從 FinLab `disposal_information` 查詢分時交易（處置）股票，
更新 etf_holdings_snapshot 的 is_disposal 欄位。

失敗時只 log error，不 raise，確保主流程不中斷。
"""

import logging
import pandas as pd
from typing import TYPE_CHECKING

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)


class DisposalDetectStep(BaseStep):
    """偵測當日處置（分時交易）股票並更新快照（輔助步驟）。"""

    @property
    def name(self) -> str:
        return "Disposal Detect"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            disposal_codes = self._get_disposal_codes(ctx.date_str)
            self._update_snapshot(ctx, services, disposal_codes)
            logger.info(
                f"[DisposalDetectStep] {ctx.date_str}: {len(disposal_codes)} 支處置股已標記"
            )
        except Exception as e:
            logger.error(f"[DisposalDetectStep] 失敗，is_disposal 保持預設值 FALSE：{e}")
        return ctx

    def _get_disposal_codes(self, date_str: str) -> set[str]:
        """從 FinLab disposal_information 取得當日處置股代號集合。"""
        from finlab import data

        df: pd.DataFrame = data.get("disposal_information")

        # 只保留「分時交易」有值的記錄（排除非分盤處置雜訊）
        df = df[df["分時交易"].notna()]

        if df.empty:
            return set()

        # 解析時間欄位
        start_col = "處置開始時間"
        end_col = "處置結束時間"
        df[start_col] = pd.to_datetime(df[start_col], errors="coerce")
        df[end_col] = pd.to_datetime(df[end_col], errors="coerce")

        target = pd.Timestamp(date_str)

        active = df[
            (df[start_col].notna())
            & (df[end_col].notna())
            & (df[start_col] <= target)
            & (df[end_col] >= target)
        ]

        # 股票代號欄位名稱可能為 "stock_id" 或 index
        if "stock_id" in active.columns:
            return set(active["stock_id"].astype(str).tolist())
        # disposal_information 以股票代號為 index
        return set(active.index.astype(str).tolist())

    def _update_snapshot(
        self,
        ctx: PipelineContext,
        services: "PipelineServices",
        disposal_codes: set[str],
    ) -> None:
        """批次 UPDATE etf_holdings_snapshot 的 is_disposal 欄位。"""
        with services.sql_storage.engine.connect() as conn:
            if disposal_codes:
                conn.execute(
                    text("""
                        UPDATE etf_holdings_snapshot
                        SET is_disposal = TRUE
                        WHERE data_date = :date_str
                          AND stock_code = ANY(:codes)
                    """),
                    {"date_str": ctx.date_str, "codes": list(disposal_codes)},
                )

            conn.execute(
                text("""
                    UPDATE etf_holdings_snapshot
                    SET is_disposal = FALSE
                    WHERE data_date = :date_str
                      AND stock_code != ALL(:codes)
                """),
                {
                    "date_str": ctx.date_str,
                    "codes": list(disposal_codes) if disposal_codes else ["__none__"],
                },
            )

            conn.commit()
