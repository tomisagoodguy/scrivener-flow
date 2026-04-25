"""
Position Summary Step

基於 etf_diff_logs 的現金流法計算各 ETF 每支個股的成本基礎與損益，
每日寫入 etf_position_summary，並彙總寫入 etf_pnl_series。

現金流法：
  CFt = -Δshares × close_t
  cost_basis 累加所有 CF（買入為正成本，賣出回收）
  mv_now = curr_shares × close_today
  pnl = mv_now - cost_basis

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import logging
from collections import defaultdict
from datetime import date
from typing import Optional

from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

# 最多回溯天數（效能保護）
MAX_HISTORY_DAYS = 365


class PositionSummaryStep(BaseStep):
    """每日計算各 ETF 持倉損益，寫入 etf_position_summary + etf_pnl_series（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Position Summary"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        try:
            self._run(ctx)
        except Exception as e:
            self.logger.error(f"PositionSummaryStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _run(self, ctx: PipelineContext) -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
        all_codes = get_all_etf_codes()

        with ctx.sql_storage.engine.connect() as conn:
            diffs = self._fetch_diffs(conn, all_codes, target_date)
            prices = self._fetch_prices(conn, target_date)
            snapshots = self._fetch_latest_shares(conn, all_codes, target_date)

        positions, pnl_rows = self._compute(diffs, prices, snapshots, target_date)

        if not positions:
            self.logger.warning("No positions computed for %s", target_date)
            return

        with ctx.sql_storage.engine.connect() as conn:
            self._upsert_positions(conn, positions)
            self._upsert_pnl_series(conn, pnl_rows)
            conn.commit()

        self.logger.info(
            "Upserted %d position rows and %d pnl_series rows for %s",
            len(positions), len(pnl_rows), target_date
        )

    @staticmethod
    def _fetch_diffs(conn, etf_codes: list[str], target_date: str) -> list[dict]:
        rows = conn.execute(text("""
            SELECT etf_code, stock_code, data_date, action,
                   diff_shares, curr_shares, prev_shares
            FROM etf_diff_logs
            WHERE etf_code = ANY(:codes)
              AND data_date <= :d
              AND data_date >= :d::date - :days * INTERVAL '1 day'
            ORDER BY data_date
        """), {"codes": etf_codes, "d": target_date, "days": MAX_HISTORY_DAYS})
        return [dict(r._mapping) for r in rows]

    @staticmethod
    def _fetch_prices(conn, target_date: str) -> dict[str, float]:
        rows = conn.execute(text("""
            SELECT stock_code, close
            FROM stock_prices_daily
            WHERE date = :d
        """), {"d": target_date})
        return {r.stock_code: float(r.close) for r in rows}

    @staticmethod
    def _fetch_latest_shares(conn, etf_codes: list[str], target_date: str) -> dict[tuple, dict]:
        rows = conn.execute(text("""
            SELECT DISTINCT ON (etf_code, stock_code)
                etf_code, stock_code, shares, data_date
            FROM etf_holdings_snapshot
            WHERE etf_code = ANY(:codes)
              AND data_date <= :d
            ORDER BY etf_code, stock_code, data_date DESC
        """), {"codes": etf_codes, "d": target_date})
        return {(r.etf_code, r.stock_code): dict(r._mapping) for r in rows}

    def _compute(
        self,
        diffs: list[dict],
        prices: dict[str, float],
        snapshots: dict[tuple, dict],
        target_date: str,
    ) -> tuple[list[dict], list[dict]]:
        # 按 (etf_code, stock_code) 分組 diffs
        groups: dict[tuple, list[dict]] = defaultdict(list)
        for d in diffs:
            groups[(d["etf_code"], d["stock_code"])].append(d)

        positions: list[dict] = []
        pnl_by_etf: dict[str, dict] = defaultdict(lambda: {
            "total_mv": 0.0, "total_cost": 0.0, "total_pnl": 0.0,
            "total_shares": 0, "active_count": 0,
        })

        for (etf_code, stock_code), events in groups.items():
            snap = snapshots.get((etf_code, stock_code))
            curr_shares = float(snap["shares"]) if snap else 0.0
            close = prices.get(stock_code)
            if close is None or close <= 0:
                continue

            # 現金流法累計成本
            cost_basis = 0.0
            first_entry: Optional[str] = None
            entry_cost_sum = 0.0
            entry_shares_sum = 0.0

            for ev in events:
                delta = float(ev.get("diff_shares") or 0)
                ev_close = prices.get(stock_code, close)  # fallback to today's price
                cf = -delta * ev_close  # 買入 → delta>0 → cf>0
                cost_basis += cf
                if ev["action"] in ("BUY", "IN") and delta > 0:
                    if not first_entry:
                        first_entry = str(ev["data_date"])
                    entry_cost_sum += delta * ev_close
                    entry_shares_sum += delta

            mv_now = curr_shares * close
            is_active = curr_shares > 0
            pnl = mv_now - cost_basis if is_active else 0.0
            pnl_pct = (pnl / cost_basis * 100) if cost_basis > 0.01 else 0.0

            first_date = str(events[0]["data_date"]) if events else target_date
            delta_days_val = (
                (date.fromisoformat(target_date) - date.fromisoformat(first_entry)).days
                if first_entry else 0
            )
            entry_price = (entry_cost_sum / entry_shares_sum) if entry_shares_sum > 0 else None

            positions.append({
                "etf_code": etf_code,
                "stock_code": stock_code,
                "data_date": target_date,
                "cost_basis": round(cost_basis / 1e8, 6),
                "mv_now": round(mv_now / 1e8, 6),
                "pnl": round(pnl / 1e8, 6),
                "pnl_pct": round(pnl_pct, 4),
                "delta_days": delta_days_val,
                "first_entry_date": first_date,
                "entry_price": round(entry_price, 4) if entry_price else None,
                "curr_price": round(close, 4),
                "curr_shares": int(curr_shares),
                "is_active": is_active,
                "exit_date": None if is_active else target_date,
                "realized_pnl_pct": round(pnl_pct, 4) if not is_active else None,
            })

            if is_active:
                etf_agg = pnl_by_etf[etf_code]
                etf_agg["total_mv"] += mv_now / 1e8
                etf_agg["total_cost"] += cost_basis / 1e8
                etf_agg["total_pnl"] += pnl / 1e8
                etf_agg["total_shares"] += int(curr_shares)
                etf_agg["active_count"] += 1

        pnl_rows: list[dict] = []
        for etf_code, agg in pnl_by_etf.items():
            total_pnl_pct = (
                agg["total_pnl"] / agg["total_cost"] * 100
                if agg["total_cost"] > 0.001 else 0.0
            )
            pnl_rows.append({
                "etf_code": etf_code,
                "data_date": target_date,
                "total_mv": round(agg["total_mv"], 6),
                "total_cost": round(agg["total_cost"], 6),
                "total_pnl": round(agg["total_pnl"], 6),
                "total_pnl_pct": round(total_pnl_pct, 4),
                "total_shares": agg["total_shares"],
                "active_count": agg["active_count"],
            })

        return positions, pnl_rows

    @staticmethod
    def _upsert_positions(conn, rows: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_position_summary
                (etf_code, stock_code, data_date, cost_basis, mv_now, pnl, pnl_pct,
                 delta_days, first_entry_date, entry_price, curr_price, curr_shares,
                 is_active, exit_date, realized_pnl_pct)
            VALUES
                (:etf_code, :stock_code, :data_date, :cost_basis, :mv_now, :pnl, :pnl_pct,
                 :delta_days, :first_entry_date, :entry_price, :curr_price, :curr_shares,
                 :is_active, :exit_date, :realized_pnl_pct)
            ON CONFLICT (etf_code, stock_code, data_date) DO UPDATE SET
                cost_basis = EXCLUDED.cost_basis,
                mv_now     = EXCLUDED.mv_now,
                pnl        = EXCLUDED.pnl,
                pnl_pct    = EXCLUDED.pnl_pct,
                delta_days = EXCLUDED.delta_days,
                curr_price = EXCLUDED.curr_price,
                curr_shares = EXCLUDED.curr_shares,
                is_active  = EXCLUDED.is_active,
                exit_date  = EXCLUDED.exit_date,
                realized_pnl_pct = EXCLUDED.realized_pnl_pct
        """)
        conn.execute(sql, rows)

    @staticmethod
    def _upsert_pnl_series(conn, rows: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_pnl_series
                (etf_code, data_date, total_mv, total_cost, total_pnl,
                 total_pnl_pct, total_shares, active_count)
            VALUES
                (:etf_code, :data_date, :total_mv, :total_cost, :total_pnl,
                 :total_pnl_pct, :total_shares, :active_count)
            ON CONFLICT (etf_code, data_date) DO UPDATE SET
                total_mv     = EXCLUDED.total_mv,
                total_cost   = EXCLUDED.total_cost,
                total_pnl    = EXCLUDED.total_pnl,
                total_pnl_pct = EXCLUDED.total_pnl_pct,
                total_shares = EXCLUDED.total_shares,
                active_count = EXCLUDED.active_count
        """)
        conn.execute(sql, rows)
