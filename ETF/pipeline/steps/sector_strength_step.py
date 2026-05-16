"""
Sector Strength Step

每日計算全市場族群漲幅（日/週/月），存入 sector_strength 與 sector_strength_stocks 表。
使用 FinLab VIP 資料 security_industry_themes + price:收盤價。

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
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

MIN_STOCK_COUNT = 5  # 族群內至少需要幾支股票才計算


class SectorStrengthStep(BaseStep):
    """每日計算族群強弱並存入 DB（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Sector Strength"

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"SectorStrengthStep failed: {e}")
        return ctx

    # ──────────────────────────────────────────────────────────────────────

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")

        import finlab
        import finlab.data as fd
        import pandas as pd

        # 確保 FinLab 已登入
        client = getattr(services.finlab_srv, "_client", None)
        if client and not client.login():
            self.logger.error("FinLab login failed, skipping SectorStrengthStep.")
            return

        # 1. 取產業題材分類
        self.logger.info("Fetching security_industry_themes...")
        themes = fd.get("security_industry_themes")
        if themes is None or themes.empty:
            self.logger.warning("security_industry_themes is empty, skipping.")
            return

        # category 欄位是字串格式的陣列，需 eval 轉換；逐行保護
        def safe_eval(s: str) -> list:
            try:
                result = eval(s)  # noqa: S307
                return result if isinstance(result, list) else [result]
            except Exception:
                return []

        themes = themes.copy()
        themes["category"] = themes["category"].apply(safe_eval)
        exploded = themes.explode("category").dropna(subset=["category"])
        exploded = exploded[exploded["category"].str.strip() != ""]

        # 2. 取收盤價，計算日/週/月漲幅 + 策略均線條件
        self.logger.info("Fetching price data...")
        close = fd.get("price:收盤價")
        if close is None or close.empty:
            self.logger.warning("price:收盤價 is empty, skipping.")
            return

        ret_1d = close.pct_change(1).iloc[-1]
        ret_5d = close.pct_change(5).iloc[-1]
        ret_20d = close.pct_change(20).iloc[-1]

        # 策略動能分數：5 日滾動均漲幅
        momentum_score = (close / close.shift() - 1).rolling(5).mean().iloc[-1]

        # 三均線多頭條件（最後一日）
        ma20 = close.average(20).iloc[-1]
        ma60 = close.average(60).iloc[-1]
        ma120 = close.average(120).iloc[-1]
        last_close = close.iloc[-1]
        above_ma = (last_close > ma20) & (last_close > ma60) & (last_close > ma120)

        # 月營收短期 > 長期
        self.logger.info("Fetching monthly revenue data...")
        try:
            rev = fd.get("monthly_revenue:當月營收")
            rev_cond = rev.average(3).iloc[-1] > rev.average(12).iloc[-1]
        except Exception as e:
            self.logger.warning(f"Failed to fetch monthly revenue, strategy hit will be False: {e}")
            rev_cond = pd.Series(False, index=last_close.index)

        # 合併策略命中
        strategy_hit = above_ma & rev_cond  # NaN → False 自動排除

        # 3. 合併漲幅 + 策略欄位到 exploded DataFrame
        df = exploded.copy()
        df["ret_1d"]         = df["stock_id"].map(ret_1d)
        df["ret_5d"]         = df["stock_id"].map(ret_5d)
        df["ret_20d"]        = df["stock_id"].map(ret_20d)
        df["momentum_score"] = df["stock_id"].map(momentum_score)
        df["is_strategy_hit"] = df["stock_id"].map(strategy_hit).fillna(False).astype(bool)

        # 4. 計算族群平均漲幅（家數 >= MIN_STOCK_COUNT）
        count_by_cat = df.groupby("category")["stock_id"].count()
        valid_cats = count_by_cat[count_by_cat >= MIN_STOCK_COUNT].index

        sector_df = (
            df[df["category"].isin(valid_cats)]
            .groupby("category")[["ret_1d", "ret_5d", "ret_20d"]]
            .mean()
            .reset_index()
        )
        sector_df["stock_count"] = sector_df["category"].map(count_by_cat)
        sector_df["date"] = target_date

        self.logger.info(f"Computed {len(sector_df)} sectors for {target_date}")

        # 5. Upsert 族群資料 + 成分股資料
        with services.sql_storage.engine.connect() as conn:
            self._upsert_sectors(conn, sector_df, target_date)
            self._upsert_stocks(conn, df[df["category"].isin(valid_cats)], target_date)
            conn.commit()

        self.logger.info(
            f"SectorStrengthStep done: {len(sector_df)} sectors upserted for {target_date}"
        )

    def _upsert_sectors(self, conn, sector_df, target_date: str) -> None:
        upsert_sql = text("""
            INSERT INTO sector_strength (date, category, ret_1d, ret_5d, ret_20d, stock_count)
            VALUES (:date, :category, :ret_1d, :ret_5d, :ret_20d, :stock_count)
            ON CONFLICT (date, category) DO UPDATE SET
                ret_1d      = EXCLUDED.ret_1d,
                ret_5d      = EXCLUDED.ret_5d,
                ret_20d     = EXCLUDED.ret_20d,
                stock_count = EXCLUDED.stock_count,
                created_at  = now()
        """)

        for _, row in sector_df.iterrows():
            conn.execute(upsert_sql, {
                "date":        target_date,
                "category":    row["category"],
                "ret_1d":      float(row["ret_1d"]) if row["ret_1d"] == row["ret_1d"] else None,
                "ret_5d":      float(row["ret_5d"]) if row["ret_5d"] == row["ret_5d"] else None,
                "ret_20d":     float(row["ret_20d"]) if row["ret_20d"] == row["ret_20d"] else None,
                "stock_count": int(row["stock_count"]),
            })

    def _upsert_stocks(self, conn, df, target_date: str) -> None:
        upsert_sql = text("""
            INSERT INTO sector_strength_stocks
                (date, category, stock_id, stock_name, ret_1d, ret_5d, ret_20d,
                 is_strategy_hit, momentum_score)
            VALUES
                (:date, :category, :stock_id, :stock_name, :ret_1d, :ret_5d, :ret_20d,
                 :is_strategy_hit, :momentum_score)
            ON CONFLICT (date, category, stock_id) DO UPDATE SET
                stock_name      = EXCLUDED.stock_name,
                ret_1d          = EXCLUDED.ret_1d,
                ret_5d          = EXCLUDED.ret_5d,
                ret_20d         = EXCLUDED.ret_20d,
                is_strategy_hit = EXCLUDED.is_strategy_hit,
                momentum_score  = EXCLUDED.momentum_score,
                created_at      = now()
        """)

        name_col = "name" if "name" in df.columns else None

        def _f(v):
            return float(v) if v == v else None  # NaN → None

        for _, row in df.iterrows():
            conn.execute(upsert_sql, {
                "date":            target_date,
                "category":        row["category"],
                "stock_id":        row["stock_id"],
                "stock_name":      row[name_col] if name_col else None,
                "ret_1d":          _f(row.get("ret_1d")),
                "ret_5d":          _f(row.get("ret_5d")),
                "ret_20d":         _f(row.get("ret_20d")),
                "is_strategy_hit": bool(row.get("is_strategy_hit", False)),
                "momentum_score":  _f(row.get("momentum_score")),
            })
