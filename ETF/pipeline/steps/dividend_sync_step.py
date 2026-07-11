"""
Dividend Sync Step

每日同步各 ETF 配息記錄到 etf_dividend_records（TWSE ETF 分配收益 API）。
配息為低頻事件（月/季），全量窗口冪等 upsert（UNIQUE(etf_code, period)），
連跑兩次筆數不變。

屬於輔助步驟：單一 ETF 失敗只 log 續跑其餘，整體失敗也不中斷 pipeline。
"""

import time

from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep
from ETF.scrapers.etf_dividend_scraper import fetch_dividends
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

# TWSE rwd API 對高頻請求會封鎖，逐 ETF 間隔請求
_REQUEST_INTERVAL_SEC = 1.5


class DividendSyncStep(BaseStep):
    """同步全部 ETF 配息記錄到 etf_dividend_records（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Dividend Sync"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(
        self, ctx: PipelineContext, services: "PipelineServices"
    ) -> PipelineContext:
        try:
            self._sync_all(services)
        except Exception as e:
            # 輔助步驟：只 log，不 raise
            self.logger.error(f"DividendSyncStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _sync_all(self, services: "PipelineServices") -> None:
        records: list[dict] = []
        codes = get_all_etf_codes()
        for i, etf_code in enumerate(codes):
            try:
                records.extend(fetch_dividends(etf_code))
            except Exception as e:
                self.logger.error("fetch dividends failed for %s: %s", etf_code, e)
            if i < len(codes) - 1:
                time.sleep(_REQUEST_INTERVAL_SEC)

        if not records:
            self.logger.info("No dividend records for any ETF")
            return

        self._upsert(services, records)
        self.logger.info("Upserted %d dividend records", len(records))

    @staticmethod
    def _upsert(services: "PipelineServices", records: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_dividend_records
                (etf_code, period, cash_per_unit, ex_date, pay_date, yield_pct, source)
            VALUES
                (:etf_code, :period, :cash_per_unit, :ex_date, :pay_date, :yield_pct, :source)
            ON CONFLICT (etf_code, period) DO UPDATE SET
                cash_per_unit = EXCLUDED.cash_per_unit,
                ex_date       = EXCLUDED.ex_date,
                pay_date      = COALESCE(EXCLUDED.pay_date, etf_dividend_records.pay_date),
                yield_pct     = COALESCE(EXCLUDED.yield_pct, etf_dividend_records.yield_pct),
                source        = EXCLUDED.source
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()
