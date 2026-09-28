"""
Sector RRG Step

族群相對大盤強弱（Relative Rotation Graph）訊號計算，緊接在 SectorStrengthStep
之後執行。用族群成分股收盤價均值 vs taiex_total_index:收盤指數，計算 RS-Ratio
（EMA 14）與 RS-Momentum（RS-Ratio 日變化的 EMA 10），分類四象限，並用象限權重
覆蓋 sector_strength.strength_score。

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import ast
import logging
from datetime import date
from typing import TYPE_CHECKING

import pandas as pd

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

MIN_STOCK_COUNT = 5  # 與 SectorStrengthStep 相同門檻

_RS_RATIO_SPAN = 14
_RS_MOMENTUM_SPAN = 10

_QUADRANT_WEIGHTS: dict[str, float] = {
    "leading": 1.15,
    "improving": 1.05,
    "weakening": 0.95,
    "lagging": 0.85,
}


def _safe_eval_list(s: str) -> list:
    try:
        result = ast.literal_eval(s)
        return result if isinstance(result, list) else [result]
    except Exception:
        return []


def _compute_rs_ratio_momentum(
    cat_close: pd.Series, taiex_close: pd.Series
) -> tuple[float | None, float | None]:
    """計算族群相對 TAIEX 的 RS-Ratio（EMA 14）與 RS-Momentum（EMA 10）。

    兩序列先以日期取交集（inner join），避免族群與大盤資料起始日不同造成錯位。
    歷史不足時（min_periods 未滿足）回傳 None，不得用 0 或估計值填補。
    """
    aligned_cat, aligned_taiex = cat_close.align(taiex_close, join="inner")
    if aligned_cat.empty:
        return None, None

    rs = (aligned_cat / aligned_cat.iloc[0]) / (aligned_taiex / aligned_taiex.iloc[0])
    rs_ratio_series = rs.ewm(span=_RS_RATIO_SPAN, min_periods=_RS_RATIO_SPAN).mean()
    rs_momentum_series = (
        rs_ratio_series.pct_change()
        .ewm(span=_RS_MOMENTUM_SPAN, min_periods=_RS_MOMENTUM_SPAN)
        .mean()
    )

    rs_ratio = rs_ratio_series.iloc[-1]
    rs_momentum = rs_momentum_series.iloc[-1]

    return (
        float(rs_ratio) if pd.notna(rs_ratio) else None,
        float(rs_momentum) if pd.notna(rs_momentum) else None,
    )


def _classify_quadrant(rs_ratio: float | None, rs_momentum: float | None) -> str | None:
    """依 RS-Ratio / RS-Momentum 正負分類四象限，任一為 None 時回傳 None。"""
    if rs_ratio is None or rs_momentum is None:
        return None
    if rs_ratio >= 1.0:
        return "leading" if rs_momentum >= 0 else "weakening"
    return "improving" if rs_momentum >= 0 else "lagging"


def _apply_quadrant_weight(
    strength_score: float | None, quadrant: str | None
) -> float | None:
    """quadrant 非 None 時用象限權重乘上 strength_score；quadrant 為 None 時原值不變。"""
    if quadrant is None or strength_score is None:
        return strength_score
    return strength_score * _QUADRANT_WEIGHTS[quadrant]


class SectorRrgStep(BaseStep):
    """計算族群相對大盤 RRG 訊號並覆蓋 strength_score（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Sector RRG"

    def execute(
        self, ctx: PipelineContext, services: "PipelineServices"
    ) -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"SectorRrgStep failed: {e}")
        return ctx

    # ──────────────────────────────────────────────────────────────────────

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")

        import finlab.data as fd

        client = getattr(services.finlab_srv, "_client", None)
        if client and not client.login():
            self.logger.error("FinLab login failed, skipping SectorRrgStep.")
            return

        self.logger.info("Fetching security_industry_themes...")
        themes = fd.get("security_industry_themes")
        if themes is None or themes.empty:
            self.logger.warning("security_industry_themes is empty, skipping.")
            return

        themes = themes.copy()
        if "stock_id" not in themes.columns:
            themes = themes.reset_index().rename(
                columns={themes.index.name or "index": "stock_id"}
            )
        themes["category"] = themes["category"].apply(_safe_eval_list)
        exploded = themes.explode("category").dropna(subset=["category"])
        exploded = exploded[exploded["category"].str.strip() != ""]

        self.logger.info("Fetching price data and TAIEX benchmark...")
        close = fd.get("price:收盤價")
        if close is None or close.empty:
            self.logger.warning("price:收盤價 is empty, skipping.")
            return

        taiex_df = fd.get("taiex_total_index:收盤指數")
        if taiex_df is None or taiex_df.empty:
            self.logger.warning("taiex_total_index:收盤指數 is empty, skipping.")
            return
        taiex_close = taiex_df.iloc[:, 0]

        count_by_cat = exploded.groupby("category")["stock_id"].count()
        valid_cats = count_by_cat[count_by_cat >= MIN_STOCK_COUNT].index

        rows: list[dict] = []
        for cat in valid_cats:
            cat_stock_ids = exploded[exploded["category"] == cat]["stock_id"].unique()
            cat_stock_ids = [s for s in cat_stock_ids if s in close.columns]
            if not cat_stock_ids:
                continue
            cat_close = close[cat_stock_ids].mean(axis=1).dropna()

            rs_ratio, rs_momentum = _compute_rs_ratio_momentum(cat_close, taiex_close)
            quadrant = _classify_quadrant(rs_ratio, rs_momentum)

            rows.append(
                {
                    "date": target_date,
                    "category": cat,
                    "rs_ratio": rs_ratio,
                    "rs_momentum": rs_momentum,
                    "rrg_quadrant": quadrant,
                }
            )

        if not rows:
            self.logger.info("No valid sectors to compute RRG for.")
            return

        with services.sql_storage.engine.connect() as conn:
            updated = self._update_sectors(conn, rows)
            conn.commit()

        with_quadrant = sum(1 for r in rows if r["rrg_quadrant"] is not None)
        self.logger.info(
            f"SectorRrgStep done: {len(rows)} sectors computed for {target_date}, "
            f"{with_quadrant} with quadrant, {updated} rows updated in DB"
        )
        if updated == 0:
            self.logger.warning(
                "SectorRrgStep: UPDATE affected 0 rows — "
                "sector_strength rows may not exist yet for this date (check step order)."
            )

    def _update_sectors(self, conn, rows: list[dict]) -> int:
        """對每個族群 UPDATE rs_ratio/rs_momentum/rrg_quadrant；quadrant 非 None 時一併加權覆蓋 strength_score。"""
        update_sql = text("""
            UPDATE sector_strength
            SET rs_ratio = :rs_ratio,
                rs_momentum = :rs_momentum,
                rrg_quadrant = :rrg_quadrant,
                strength_score = CASE
                    WHEN :rrg_quadrant IS NOT NULL AND strength_score IS NOT NULL
                        THEN strength_score * :multiplier
                    ELSE strength_score
                END,
                created_at = now()
            WHERE date = :date AND category = :category
        """)

        total_updated = 0
        for row in rows:
            quadrant = row["rrg_quadrant"]
            multiplier = _QUADRANT_WEIGHTS.get(quadrant, 1.0) if quadrant else 1.0
            result = conn.execute(
                update_sql,
                {
                    "date": row["date"],
                    "category": row["category"],
                    "rs_ratio": row["rs_ratio"],
                    "rs_momentum": row["rs_momentum"],
                    "rrg_quadrant": quadrant,
                    "multiplier": multiplier,
                },
            )
            total_updated += result.rowcount
        return total_updated
