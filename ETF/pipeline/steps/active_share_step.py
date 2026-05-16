"""
Active Share Step

每週計算所有主動 ETF 兩兩持股重疊度（Active Share）矩陣：
  AS(A, B) = 0.5 × Σ|w_A(i) - w_B(i)|

同時計算各 ETF 對 industry-mean 組合的 AS。
寫入 etf_active_share 表。

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import logging
import re
from collections import defaultdict
from datetime import date
from itertools import combinations

from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

TW_STOCK_PATTERN = re.compile(r"^\d{4}[A-Z]?$")
MIN_TW_EXPOSURE = 50.0   # TW 股票最低持倉比例（%）


class ActiveShareStep(BaseStep):
    """主動 ETF 兩兩持股重疊度矩陣（輔助步驟，每週執行）"""

    @property
    def name(self) -> str:
        return "Active Share"

    def should_skip(self, ctx: PipelineContext) -> bool:
        if ctx.is_dry_run:
            return True
        # 只在每週一執行（weekday 0 = Monday）
        today = date.today()
        return today.weekday() != 0

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            portfolios = self._load_portfolios(ctx, services)
            if len(portfolios) < 2:
                self.logger.warning("Fewer than 2 ETFs with sufficient TW exposure; skipping")
                return ctx

            computed_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
            records = self._compute_matrix(portfolios, computed_date)
            self._upsert(services, records)
            self.logger.info(
                "Upserted %d Active Share records for %s (%d ETFs)",
                len(records), computed_date, len(portfolios),
            )
        except Exception as e:
            self.logger.error(f"ActiveShareStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _load_portfolios(self, ctx: PipelineContext, services: "PipelineServices") -> dict[str, dict[str, float]]:
        """讀取各 ETF 最新快照，過濾 TW 股票並 renormalize"""
        all_codes = get_all_etf_codes()

        sql = text("""
            SELECT DISTINCT ON (etf_code, stock_code)
                etf_code, stock_code, weight
            FROM etf_holdings_snapshot
            WHERE etf_code = ANY(:codes)
            ORDER BY etf_code, stock_code, data_date DESC
        """)
        with services.sql_storage.engine.connect() as conn:
            rows = conn.execute(sql, {"codes": all_codes}).fetchall()

        raw: dict[str, dict[str, float]] = defaultdict(dict)
        for r in rows:
            raw[r.etf_code][r.stock_code] = float(r.weight or 0)

        portfolios: dict[str, dict[str, float]] = {}
        for etf_code, holdings in raw.items():
            tw_holdings = {
                code: w for code, w in holdings.items()
                if TW_STOCK_PATTERN.match(code)
            }
            tw_total = sum(tw_holdings.values())
            if tw_total < MIN_TW_EXPOSURE:
                self.logger.info(
                    "ETF %s TW exposure %.1f%% < %.0f%%; excluded",
                    etf_code, tw_total, MIN_TW_EXPOSURE,
                )
                continue
            # renormalize to 100%
            portfolios[etf_code] = {
                code: w / tw_total * 100
                for code, w in tw_holdings.items()
            }
        return portfolios

    def _compute_matrix(
        self, portfolios: dict[str, dict[str, float]], computed_date: str
    ) -> list[dict]:
        """計算 industry-mean 組合並產出兩兩 AS 記錄"""
        etf_codes = sorted(portfolios.keys())

        # industry-mean = equal-weight average across all ETFs
        all_stocks: set[str] = set()
        for p in portfolios.values():
            all_stocks.update(p.keys())

        n = len(etf_codes)
        mean_port: dict[str, float] = {}
        for stock in all_stocks:
            mean_port[stock] = sum(portfolios[e].get(stock, 0.0) for e in etf_codes) / n

        # precompute AS vs mean for each ETF
        as_vs_mean: dict[str, float] = {}
        for etf in etf_codes:
            as_vs_mean[etf] = self._active_share(portfolios[etf], mean_port)

        records = []
        for etf_a, etf_b in combinations(etf_codes, 2):
            as_pct = self._active_share(portfolios[etf_a], portfolios[etf_b])
            records.append({
                "computed_date": computed_date,
                "etf_a": etf_a,
                "etf_b": etf_b,
                "active_share_pct": round(as_pct, 4),
                "as_vs_mean_a": round(as_vs_mean[etf_a], 4),
                "as_vs_mean_b": round(as_vs_mean[etf_b], 4),
            })
        return records

    @staticmethod
    def _active_share(port_a: dict[str, float], port_b: dict[str, float]) -> float:
        """AS(A, B) = 0.5 × Σ|w_A(i) - w_B(i)|"""
        all_stocks = set(port_a) | set(port_b)
        return 0.5 * sum(abs(port_a.get(s, 0.0) - port_b.get(s, 0.0)) for s in all_stocks)

    @staticmethod
    def _upsert(services: "PipelineServices", records: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_active_share
                (computed_date, etf_a, etf_b, active_share_pct, as_vs_mean_a, as_vs_mean_b)
            VALUES
                (:computed_date, :etf_a, :etf_b, :active_share_pct, :as_vs_mean_a, :as_vs_mean_b)
            ON CONFLICT (computed_date, etf_a, etf_b) DO UPDATE SET
                active_share_pct = EXCLUDED.active_share_pct,
                as_vs_mean_a     = EXCLUDED.as_vs_mean_a,
                as_vs_mean_b     = EXCLUDED.as_vs_mean_b
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, records)
            conn.commit()
