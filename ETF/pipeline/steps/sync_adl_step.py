"""
Sync ADL Step

每日計算全市場騰落指標（ADL/ADR/MA），upsert 至 market_breadth_daily。
依照 reference/advance_decline_line.py 邏輯，benchmark=1（昨日收盤為基準）。
屬輔助步驟，失敗不中斷 pipeline。
"""

import logging
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

MA_WINDOWS = [5, 60]
BENCHMARK = 1  # price ratio > 1 → up, < 1 → down


class SyncAdlStep(BaseStep):
    """計算大盤 ADL/ADR 並 upsert 至 market_breadth_daily（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Sync ADL"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"SyncAdlStep failed: {e}")
        return ctx

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")

        import finlab.data as fd
        import pandas as pd

        # FinLab 登入
        client = getattr(services.finlab_srv, "_client", None)
        if client and not client.login():
            self.logger.error("FinLab login failed, skipping SyncAdlStep.")
            return

        self.logger.info("Fetching etl:adj_close for ADL...")
        try:
            close_df = fd.get("etl:adj_close")
        except Exception as e:
            self.logger.error(f"Failed to fetch etl:adj_close: {e}")
            return

        if close_df is None or close_df.empty or len(close_df) < 2:
            self.logger.warning("adj_close data insufficient for ADL, skipping.")
            return

        # 計算每日漲跌家數（按照 reference 邏輯）
        fluctuation = close_df / close_df.shift()
        fluctuation = fluctuation.dropna(how="all").T  # (stock × date)

        dataset = []
        for col in fluctuation.columns:
            daily = fluctuation[col].dropna()
            ups = int((daily > BENCHMARK).sum())
            downs = int((daily < BENCHMARK).sum())
            dataset.append({"date": str(col.date()) if hasattr(col, "date") else str(col), "ups": ups, "downs": downs})

        ad_df = pd.DataFrame(dataset)
        ad_df = ad_df.sort_values("date").reset_index(drop=True)
        ad_df["net"] = ad_df["ups"] - ad_df["downs"]
        ad_df["adl"] = ad_df["net"].cumsum()
        total = ad_df["ups"] + ad_df["downs"]
        ad_df["adr"] = ad_df["ups"] / total.where(total > 0)

        for w in MA_WINDOWS:
            ad_df[f"adl_ma{w}"] = ad_df["adl"].rolling(w).mean()
            ad_df[f"adr_ma{w}"] = ad_df["adr"].rolling(w).mean()

        # 只 upsert 目標日期當日
        today_rows = ad_df[ad_df["date"] == target_date]
        if today_rows.empty:
            # 如果目標日期沒有交易資料，取最後一筆
            today_rows = ad_df.tail(1)
            self.logger.info(f"No data for {target_date}, using last available: {today_rows['date'].iloc[0]}")

        row = today_rows.iloc[0]
        record = {
            "date": str(row["date"]),
            "ups": int(row["ups"]),
            "downs": int(row["downs"]),
            "net": int(row["net"]),
            "adl": float(row["adl"]),
            "adr": float(row["adr"]) if pd.notna(row["adr"]) else None,
            "adl_ma5": float(row["adl_ma5"]) if pd.notna(row["adl_ma5"]) else None,
            "adl_ma60": float(row["adl_ma60"]) if pd.notna(row["adl_ma60"]) else None,
            "adr_ma5": float(row["adr_ma5"]) if pd.notna(row["adr_ma5"]) else None,
            "adr_ma60": float(row["adr_ma60"]) if pd.notna(row["adr_ma60"]) else None,
        }

        self.logger.info(f"Upserting ADL record for {record['date']}: ups={record['ups']}, downs={record['downs']}, adl={record['adl']:.0f}")
        self._upsert(record, services)

    def _upsert(self, record: dict, services: "PipelineServices") -> None:
        sql = text("""
            INSERT INTO market_breadth_daily
                (date, ups, downs, net, adl, adr, adl_ma5, adl_ma60, adr_ma5, adr_ma60)
            VALUES
                (:date, :ups, :downs, :net, :adl, :adr, :adl_ma5, :adl_ma60, :adr_ma5, :adr_ma60)
            ON CONFLICT (date) DO UPDATE SET
                ups      = EXCLUDED.ups,
                downs    = EXCLUDED.downs,
                net      = EXCLUDED.net,
                adl      = EXCLUDED.adl,
                adr      = EXCLUDED.adr,
                adl_ma5  = EXCLUDED.adl_ma5,
                adl_ma60 = EXCLUDED.adl_ma60,
                adr_ma5  = EXCLUDED.adr_ma5,
                adr_ma60 = EXCLUDED.adr_ma60
        """)
        try:
            with services.sql_storage.engine.connect() as conn:
                conn.execute(sql, record)
                conn.commit()
            self.logger.info(f"ADL upserted for {record['date']}.")
        except Exception as e:
            self.logger.error(f"Failed to upsert market_breadth_daily: {e}")
