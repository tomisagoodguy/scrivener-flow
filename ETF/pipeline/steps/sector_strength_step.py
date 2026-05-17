"""
Sector Strength Step

每日計算全市場族群漲幅（日/週/月），存入 sector_strength 與 sector_strength_stocks 表。
使用 FinLab VIP 資料 security_industry_themes + price:收盤價。

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import ast
import logging
from datetime import date
from typing import TYPE_CHECKING

import numpy as np

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

MIN_STOCK_COUNT = 5  # 族群內至少需要幾支股票才計算


def _safe_eval_list(s: str) -> list:
    try:
        result = ast.literal_eval(s)
        return result if isinstance(result, list) else [result]
    except Exception:
        return []


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

        themes = themes.copy()
        themes["category"] = themes["category"].apply(_safe_eval_list)
        exploded = themes.explode("category").dropna(subset=["category"])
        exploded = exploded[exploded["category"].str.strip() != ""]

        # 2. 取收盤價 + 成交金額，計算日/週/月漲幅 + 策略均線條件
        self.logger.info("Fetching price data...")
        close = fd.get("price:收盤價")
        if close is None or close.empty:
            self.logger.warning("price:收盤價 is empty, skipping.")
            return

        ret_1d = close.pct_change(1).iloc[-1]
        ret_5d = close.pct_change(5).iloc[-1]
        ret_20d = close.pct_change(20).iloc[-1]

        # 當日成交金額（元）+ 5 日均量
        # FinLab 欄位名稱因版本而異，依序嘗試；最終備援用股數×收盤價估算
        last_amount = None
        avg_5d_by_stock = None
        try:
            amount = None
            for _col in ("price:成交金額", "price:成交金額(元)"):
                try:
                    _df = fd.get(_col)
                    if _df is not None and not _df.empty:
                        amount = _df
                        self.logger.info(f"Fetched trading amount via '{_col}'")
                        break
                except Exception:
                    continue
            if amount is None or amount.empty:
                # 備援：成交股數 × 收盤價（近似值）
                vol = fd.get("price:成交股數")
                if vol is not None and not vol.empty:
                    amount = vol.multiply(close)
                    self.logger.info("Trading amount estimated from shares × close (fallback)")
            if amount is not None and not amount.empty:
                last_amount = amount.iloc[-1]
                avg_5d_by_stock = amount.iloc[-6:-1].mean()
        except Exception as e:
            self.logger.warning(f"Failed to fetch 成交金額: {e}")

        # 策略動能分數：5 日滾動均漲幅
        momentum_score = (close / close.shift() - 1).rolling(5).mean().iloc[-1]

        # 均線多頭排列：股價 > MA5 > MA20 > MA60，且 MA20 近 5 日向上
        ma5  = close.average(5).iloc[-1]
        ma20 = close.average(20).iloc[-1]
        ma60 = close.average(60).iloc[-1]
        last_close = close.iloc[-1]
        ma20_rising = close.average(20).rise(5).iloc[-1]
        above_ma = (
            (last_close > ma5)
            & (ma5 > ma20)
            & (ma20 > ma60)
            & ma20_rising
        )

        # 月營收短期 > 長期
        self.logger.info("Fetching monthly revenue data...")
        try:
            rev = fd.get("monthly_revenue:當月營收")
            rev_cond = rev.average(3).iloc[-1] > rev.average(12).iloc[-1]
        except Exception as e:
            self.logger.warning(f"Failed to fetch monthly revenue, strategy hit will be False: {e}")
            rev_cond = pd.Series(False, index=last_close.index)

        # 蠟燭波動率 <= 12%：濾除高波動股（candle path ÷ close，20 日均值）
        low_volatility = pd.Series(True, index=last_close.index)
        try:
            high  = fd.get("price:最高價")
            low_p = fd.get("price:最低價")
            open_ = fd.get("price:開盤價")
            bullish = close >= open_
            bull_path = (abs(close.shift() - open_) + abs(open_ - low_p)
                         + abs(low_p - high) + abs(high - close))
            bear_path = (abs(close.shift() - open_) + abs(open_ - high)
                         + abs(high - low_p) + abs(low_p - close))
            candle_path = pd.DataFrame(
                np.where(bullish, bull_path, bear_path),
                index=close.index,
                columns=close.columns,
            )
            volatility = candle_path.rolling(20).mean() / close.rolling(20).mean() * 100
            low_volatility = volatility.iloc[-1] <= 12
        except Exception as e:
            self.logger.warning(f"Failed to compute candle volatility, skipping filter: {e}")

        # 合併策略命中
        strategy_hit = above_ma & rev_cond & low_volatility  # NaN → False 自動排除

        # 3. 合併漲幅 + 策略欄位到 exploded DataFrame
        df = exploded.copy()
        df["ret_1d"]         = df["stock_id"].map(ret_1d)
        df["ret_5d"]         = df["stock_id"].map(ret_5d)
        df["ret_20d"]        = df["stock_id"].map(ret_20d)
        df["momentum_score"] = df["stock_id"].map(momentum_score)
        df["is_strategy_hit"] = df["stock_id"].map(strategy_hit).fillna(False).astype(bool)
        if last_amount is not None:
            df["amount"] = df["stock_id"].map(last_amount)
        else:
            df["amount"] = None

        if avg_5d_by_stock is not None:
            df["avg_5d"] = df["stock_id"].map(avg_5d_by_stock)
        else:
            df["avg_5d"] = None

        # 4. 計算族群平均漲幅 + 總成交金額（家數 >= MIN_STOCK_COUNT）
        count_by_cat = df.groupby("category")["stock_id"].count()
        valid_cats = count_by_cat[count_by_cat >= MIN_STOCK_COUNT].index

        valid_df = df[df["category"].isin(valid_cats)]
        sector_df = (
            valid_df.groupby("category")[["ret_1d", "ret_5d", "ret_20d"]]
            .mean()
            .reset_index()
        )
        sector_df["stock_count"] = sector_df["category"].map(count_by_cat)
        sector_df["date"] = target_date

        # 計算族群總成交金額
        if valid_df["amount"].notna().any():
            total_amount_by_cat = valid_df.groupby("category")["amount"].sum()
            sector_df["total_amount"] = sector_df["category"].map(total_amount_by_cat)
        else:
            sector_df["total_amount"] = None

        def _breadth(x):
            valid = x.dropna()
            return float((valid > 0).sum()) / len(valid) if len(valid) > 0 else None

        breadth_by_cat = valid_df.groupby("category")["ret_1d"].apply(_breadth)
        sector_df = sector_df.merge(
            breadth_by_cat.rename("breadth").reset_index(), on="category", how="left"
        )

        if valid_df["avg_5d"].notna().any():
            avg_amount_5d_by_cat = valid_df.groupby("category")["avg_5d"].sum(min_count=1)
            sector_df["avg_amount_5d"] = sector_df["category"].map(avg_amount_5d_by_cat)
        else:
            sector_df["avg_amount_5d"] = None

        sector_df["strength_score"] = sector_df["ret_1d"] * sector_df["breadth"]

        self.logger.info(f"Computed {len(sector_df)} sectors for {target_date}")

        # 5. Upsert 族群資料 + 成分股資料
        with services.sql_storage.engine.connect() as conn:
            self._upsert_sectors(conn, sector_df, target_date)
            self._upsert_stocks(conn, valid_df, target_date)
            conn.commit()

        # 6. 把策略命中股票加進 ctx.secondary_stock_codes，供 SyncOHLCVStep 同步 K 線
        hit_codes = valid_df[valid_df["is_strategy_hit"]]["stock_id"].astype(str).tolist()
        ctx.secondary_stock_codes = list(set(ctx.secondary_stock_codes + hit_codes))
        self.logger.info(
            f"SectorStrengthStep done: {len(sector_df)} sectors upserted for {target_date}, "
            f"{len(hit_codes)} strategy-hit stocks added to secondary_stock_codes"
        )

    @staticmethod
    def _f(v) -> float | None:
        """NaN-safe float conversion."""
        return float(v) if v is not None and v == v else None

    @staticmethod
    def _int_or_none(v) -> int | None:
        """NaN-safe int conversion."""
        f = SectorStrengthStep._f(v)
        return int(f) if f is not None else None

    def _upsert_sectors(self, conn, sector_df, target_date: str) -> None:
        upsert_sql = text("""
            INSERT INTO sector_strength (date, category, ret_1d, ret_5d, ret_20d, stock_count, total_amount,
                                         breadth, avg_amount_5d, strength_score)
            VALUES (:date, :category, :ret_1d, :ret_5d, :ret_20d, :stock_count, :total_amount,
                    :breadth, :avg_amount_5d, :strength_score)
            ON CONFLICT (date, category) DO UPDATE SET
                ret_1d         = EXCLUDED.ret_1d,
                ret_5d         = EXCLUDED.ret_5d,
                ret_20d        = EXCLUDED.ret_20d,
                stock_count    = EXCLUDED.stock_count,
                total_amount   = EXCLUDED.total_amount,
                breadth        = EXCLUDED.breadth,
                avg_amount_5d  = EXCLUDED.avg_amount_5d,
                strength_score = EXCLUDED.strength_score,
                created_at     = now()
        """)

        params = []
        for _, row in sector_df.iterrows():
            params.append({
                "date":           target_date,
                "category":       row["category"],
                "ret_1d":         self._f(row["ret_1d"]),
                "ret_5d":         self._f(row["ret_5d"]),
                "ret_20d":        self._f(row["ret_20d"]),
                "stock_count":    int(row["stock_count"]),
                "total_amount":   self._int_or_none(row.get("total_amount")),
                "breadth":        self._f(row.get("breadth")),
                "avg_amount_5d":  self._int_or_none(row.get("avg_amount_5d")),
                "strength_score": self._f(row.get("strength_score")),
            })
        conn.execute(upsert_sql, params)

    def _upsert_stocks(self, conn, df, target_date: str) -> None:
        upsert_sql = text("""
            INSERT INTO sector_strength_stocks
                (date, category, stock_id, stock_name, ret_1d, ret_5d, ret_20d,
                 is_strategy_hit, momentum_score, amount)
            VALUES
                (:date, :category, :stock_id, :stock_name, :ret_1d, :ret_5d, :ret_20d,
                 :is_strategy_hit, :momentum_score, :amount)
            ON CONFLICT (date, category, stock_id) DO UPDATE SET
                stock_name      = EXCLUDED.stock_name,
                ret_1d          = EXCLUDED.ret_1d,
                ret_5d          = EXCLUDED.ret_5d,
                ret_20d         = EXCLUDED.ret_20d,
                is_strategy_hit = EXCLUDED.is_strategy_hit,
                momentum_score  = EXCLUDED.momentum_score,
                amount          = EXCLUDED.amount,
                created_at      = now()
        """)

        name_col = "name" if "name" in df.columns else None

        params = [
            {
                "date":            target_date,
                "category":        row["category"],
                "stock_id":        row["stock_id"],
                "stock_name":      row[name_col] if name_col else None,
                "ret_1d":          self._f(row.get("ret_1d")),
                "ret_5d":          self._f(row.get("ret_5d")),
                "ret_20d":         self._f(row.get("ret_20d")),
                "is_strategy_hit": bool(row.get("is_strategy_hit", False)),
                "momentum_score":  self._f(row.get("momentum_score")),
                "amount":          self._int_or_none(row.get("amount")),
            }
            for _, row in df.iterrows()
        ]
        conn.execute(upsert_sql, params)
