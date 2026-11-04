"""
Margin Regime Step

每日計算融資（上市＋上櫃）是否創一年新高，以及「融資創高後 vs 平常日」之後 60 日跌一成的
全歷史統計，upsert 至 market_margin_regime_daily，供市場籌碼頁融資說明卡讀取。
口徑與統計見 ETF/analysis/margin_regime.py。屬輔助步驟，失敗不中斷 pipeline。
"""

import json
from datetime import date
from typing import TYPE_CHECKING

import pandas as pd
from sqlalchemy import text

from ETF.analysis.margin_regime import build_margin_record, compute_margin_frame, compute_margin_stats
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep, StepDomain

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

HISTORY_START = "2007-01-01"  # 2008 起統計需先有 250 日回看


class MarginRegimeStep(BaseStep):
    """計算融資創一年新高狀態並 upsert 至 market_margin_regime_daily（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Margin Regime"

    @property
    def domain(self) -> StepDomain:
        return StepDomain.MARKET

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            margin, close, low = self._fetch_series()
            target = pd.Timestamp(ctx.date_str or date.today().strftime("%Y-%m-%d"))
            frame = compute_margin_frame(
                margin[(margin.index >= HISTORY_START) & (margin.index <= target)].ffill(),
                close[(close.index >= HISTORY_START) & (close.index <= target)],
                low,
            )
            record_date = frame.loc[:target].index[-1]
            # 指數已有當天、融資尚未公布（或當天空白）時不寫，避免 NaN 或沿用前一日餘額
            if pd.isna(margin.get(record_date)):
                self.logger.warning(f"Margin regime skipped: margin not published for {record_date.date()}")
                return ctx
            record = build_margin_record(frame, target, compute_margin_stats(frame))
            self._upsert(record, services)
            self.logger.info(
                f"Margin regime {record['date']}: balance={record['margin_balance']}億, "
                f"1y_high={record['margin_1y_high']}"
            )
        except Exception as e:
            self.logger.error(f"MarginRegimeStep failed: {e}", exc_info=True)
        return ctx

    def _fetch_series(self) -> tuple[pd.Series, pd.Series, pd.Series]:
        """FinLab：上市＋上櫃融資金額（元，原始值）、加權指數收盤與盤中最低。"""
        import finlab.data as fd

        balance = pd.DataFrame(fd.get("margin_balance:融資券總餘額"))
        # 不先 ffill：任一市場空白即為 NaN，由 execute 判斷當天是否已公布
        margin = balance[["上市融資交易金額", "上櫃融資交易金額"]].sum(axis=1, min_count=2)
        close = pd.DataFrame(fd.get("taiex_total_index:收盤指數")).iloc[:, 0].dropna()
        low = pd.DataFrame(fd.get("taiex_total_index:最低指數")).iloc[:, 0]
        return margin, close, low

    def _upsert(self, record: dict, services: "PipelineServices") -> None:
        sql = text("""
            INSERT INTO market_margin_regime_daily
                (date, margin_balance, margin_1y_high, index_near_high, stats, updated_at)
            VALUES
                (:date, :margin_balance, :margin_1y_high, :index_near_high, CAST(:stats AS jsonb), NOW())
            ON CONFLICT (date) DO UPDATE SET
                margin_balance  = EXCLUDED.margin_balance,
                margin_1y_high  = EXCLUDED.margin_1y_high,
                index_near_high = EXCLUDED.index_near_high,
                stats           = EXCLUDED.stats,
                updated_at      = NOW()
        """)
        params = {**record, "stats": json.dumps(record["stats"], ensure_ascii=False)}
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, params)
            conn.commit()
