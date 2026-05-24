"""
Sync Treemap Step

每日計算全市場個股收盤價、市值、族群分類，upsert 至 market_treemap_daily。
保留最近 90 天，刪除舊記錄。屬輔助步驟，失敗不中斷 pipeline。
"""

import logging
from datetime import date, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

RETAIN_DAYS = 90


class SyncTreemapStep(BaseStep):
    """同步全市場個股快照至 market_treemap_daily（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Sync Treemap"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"SyncTreemapStep failed: {e}")
        return ctx

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")

        import finlab.data as fd
        import pandas as pd
        import ast

        # FinLab 登入
        client = getattr(services.finlab_srv, "_client", None)
        if client and not client.login():
            self.logger.error("FinLab login failed, skipping SyncTreemapStep.")
            return

        # 1. 取族群分類
        self.logger.info("Fetching security_industry_themes for treemap...")
        try:
            themes = fd.get("security_industry_themes")
        except Exception as e:
            self.logger.error(f"Failed to fetch security_industry_themes: {e}")
            return

        if themes is None or themes.empty:
            self.logger.warning("security_industry_themes is empty, skipping.")
            return

        # 取每支股票第一個分類標籤
        def first_category(val: object) -> str | None:
            try:
                cats = ast.literal_eval(str(val)) if isinstance(val, str) else val
                if isinstance(cats, list) and cats:
                    return str(cats[0])
            except Exception:
                pass
            return None

        stock_industry: dict[str, str | None] = {}
        for stock_code, row in themes.iterrows():
            stock_industry[str(stock_code)] = first_category(row.get("category"))

        # 2. 取收盤價（etl:adj_close）
        self.logger.info("Fetching adj_close for treemap...")
        try:
            close_df = fd.get("etl:adj_close")
        except Exception as e:
            self.logger.error(f"Failed to fetch etl:adj_close: {e}")
            return

        if close_df is None or close_df.empty or len(close_df) < 2:
            self.logger.warning("adj_close data insufficient, skipping.")
            return

        last_close = close_df.iloc[-1]
        prev_close = close_df.iloc[-2]
        change_pct = (last_close / prev_close - 1).where(prev_close > 0)

        # 3. 取市值（etl:market_cap）
        self.logger.info("Fetching market_cap for treemap...")
        last_mktcap = pd.Series(dtype=float)
        try:
            mktcap_df = fd.get("etl:market_cap")
            if mktcap_df is not None and not mktcap_df.empty:
                last_mktcap = mktcap_df.iloc[-1]
            else:
                self.logger.warning("etl:market_cap returned empty, market_cap will be null in treemap rows.")
        except Exception as e:
            self.logger.warning(f"Failed to fetch etl:market_cap: {e}")

        # 4. 取股票名稱
        stock_names: dict[str, str] = {}
        try:
            basic = fd.get("security_categories")
            if basic is not None and not basic.empty and "公司簡稱" in basic.columns:
                for code, row in basic.iterrows():
                    stock_names[str(code)] = str(row["公司簡稱"])
        except Exception:
            pass

        # 5. 組裝 rows
        rows = []
        all_codes = set(last_close.index)
        for code in all_codes:
            close_val = last_close.get(code)
            if close_val is None or pd.isna(close_val) or close_val <= 0:
                continue
            mktcap_val = last_mktcap.get(code)
            rows.append({
                "date": target_date,
                "stock_code": str(code),
                "stock_name": stock_names.get(str(code)),
                "industry": stock_industry.get(str(code)),
                "market_cap": int(mktcap_val) if mktcap_val is not None and not pd.isna(mktcap_val) else None,
                "close": float(round(close_val, 4)),
                "change_pct": float(round(change_pct.get(code, 0) or 0, 6)),
            })

        if not rows:
            self.logger.warning("No treemap rows assembled, skipping upsert.")
            return

        self.logger.info(f"Upserting {len(rows)} treemap rows for {target_date}...")
        self._upsert(rows, services)

        # 6. 刪除 90 天前舊記錄
        cutoff = (date.fromisoformat(target_date) - timedelta(days=RETAIN_DAYS)).isoformat()
        self._delete_old(cutoff, services)

    def _upsert(self, rows: list[dict], services: "PipelineServices") -> None:
        sql = text("""
            INSERT INTO market_treemap_daily
                (date, stock_code, stock_name, industry, market_cap, close, change_pct)
            VALUES
                (:date, :stock_code, :stock_name, :industry, :market_cap, :close, :change_pct)
            ON CONFLICT (date, stock_code) DO UPDATE SET
                stock_name = EXCLUDED.stock_name,
                industry   = EXCLUDED.industry,
                market_cap = EXCLUDED.market_cap,
                close      = EXCLUDED.close,
                change_pct = EXCLUDED.change_pct
        """)
        try:
            with services.sql_storage.engine.connect() as conn:
                conn.execute(sql, rows)
                conn.commit()
        except Exception as e:
            self.logger.error(f"Failed to upsert market_treemap_daily: {e}")

    def _delete_old(self, cutoff: str, services: "PipelineServices") -> None:
        sql = text("DELETE FROM market_treemap_daily WHERE date < :cutoff")
        try:
            with services.sql_storage.engine.connect() as conn:
                result = conn.execute(sql, {"cutoff": cutoff})
                conn.commit()
            self.logger.info(f"Deleted {result.rowcount} old treemap rows (before {cutoff}).")
        except Exception as e:
            self.logger.error(f"Failed to delete old treemap rows: {e}")
