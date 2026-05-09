"""
Flow Compute Step

計算每日跨 ETF 資金流向，寫入 etf_flow_daily。
同時將「≥ 3 支 ETF 同日買入同股」事件寫入 etf_signals。

過濾門檻：
  |Δshares / prev_shares| ≥ 3%  且  weight_change ≥ 0.3pp

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import json
import logging
from collections import defaultdict
from datetime import date

from sqlalchemy import text

from ETF.config.etf_registry import get_all_etf_codes
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

# 過濾門檻
SHARES_CHANGE_RATIO = 0.03   # Δshares/prev_shares ≥ 3%
WEIGHT_CHANGE_PP = 0.3       # weight change ≥ 0.3pp
CROSS_BUY_MIN_ETFS = 3       # cross_etf_same_day_buy 最少 ETF 數

# action 分類
BUY_ACTIONS = {'BUY', 'IN'}
SELL_ACTIONS = {'SELL', 'OUT'}


class FlowComputeStep(BaseStep):
    """計算每日跨 ETF 資金流向，upsert etf_flow_daily + 寫 etf_signals（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Flow Compute"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        try:
            self._run(ctx)
        except Exception as e:
            self.logger.error(f"FlowComputeStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _run(self, ctx: PipelineContext) -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")
        all_codes = get_all_etf_codes()

        with ctx.sql_storage.engine.connect() as conn:
            diffs = self._fetch_diffs(conn, all_codes, target_date)
            prices = self._fetch_prices(conn, target_date)
            prev_shares_map = self._fetch_prev_shares(conn, all_codes, target_date)

        filtered = self._filter_diffs(diffs, prev_shares_map)
        etfs_covered = list({d['etf_code'] for d in filtered})
        etfs_lagging = [c for c in all_codes if c not in etfs_covered]

        inflow, outflow, by_etf_map = self._aggregate(filtered, prices)
        totals = self._compute_totals(inflow, outflow)

        with ctx.sql_storage.engine.connect() as conn:
            self._upsert_flow(conn, target_date, etfs_covered, etfs_lagging, inflow, outflow, by_etf_map, totals)
            self._write_cross_buy_signals(conn, inflow, target_date)
            conn.commit()

        self.logger.info(
            "Flow computed for %s: %d inflow, %d outflow stocks",
            target_date, len(inflow), len(outflow)
        )

    @staticmethod
    def _fetch_diffs(conn, etf_codes: list[str], target_date: str) -> list[dict]:
        rows = conn.execute(text("""
            SELECT etf_code, stock_code, stock_name, change_type AS action,
                   diff_shares, curr_shares, prev_shares,
                   prev_weight, curr_weight
            FROM etf_diff_logs
            WHERE etf_code = ANY(:codes)
              AND data_date = :d
        """), {"codes": etf_codes, "d": target_date})
        return [dict(r._mapping) for r in rows]

    @staticmethod
    def _fetch_prices(conn, target_date: str) -> dict[str, float]:
        rows = conn.execute(text("""
            SELECT stock_code, close
            FROM stock_prices_daily
            WHERE data_date = :d
        """), {"d": target_date})
        return {r.stock_code: float(r.close) for r in rows}

    @staticmethod
    def _fetch_prev_shares(conn, etf_codes: list[str], target_date: str) -> dict[tuple, float]:
        rows = conn.execute(text("""
            SELECT DISTINCT ON (etf_code, stock_code)
                etf_code, stock_code, shares
            FROM etf_holdings_snapshot
            WHERE etf_code = ANY(:codes)
              AND data_date < :d
            ORDER BY etf_code, stock_code, data_date DESC
        """), {"codes": etf_codes, "d": target_date})
        return {(r.etf_code, r.stock_code): float(r.shares) for r in rows}

    def _filter_diffs(self, diffs: list[dict], prev_shares_map: dict) -> list[dict]:
        result = []
        for d in diffs:
            delta = abs(float(d.get('diff_shares') or 0))
            prev = prev_shares_map.get((d['etf_code'], d['stock_code']), 0)
            weight_change = abs(float(d.get('curr_weight') or 0) - float(d.get('prev_weight') or 0))

            shares_ratio = delta / prev if prev > 0 else 1.0
            if shares_ratio < SHARES_CHANGE_RATIO and weight_change < WEIGHT_CHANGE_PP:
                continue
            result.append(d)
        return result

    @staticmethod
    def _aggregate(filtered: list[dict], prices: dict) -> tuple[list, list, dict]:
        buy_map: dict[str, dict] = {}
        sell_map: dict[str, dict] = {}
        by_etf: dict[str, dict] = defaultdict(lambda: {'net_flow': 0.0, 'buy_count': 0, 'sell_count': 0})

        for d in filtered:
            code = d['stock_code']
            close = prices.get(code, 0)
            delta = float(d.get('diff_shares') or 0)
            nt = delta * close  # diff_shares 單位是股，× 每股價格 = 元

            action = d['action']
            if action in BUY_ACTIONS:
                if code not in buy_map:
                    buy_map[code] = {
                        'stock_code': code, 'stock_name': d.get('stock_name') or code,
                        'total_nt': 0.0, 'delta_shares': 0.0, 'by_etf': []
                    }
                buy_map[code]['total_nt'] += nt
                buy_map[code]['delta_shares'] += delta
                buy_map[code]['by_etf'].append({
                    'etf_code': d['etf_code'], 'nt': round(nt, 0),
                    'kind': action
                })
                by_etf[d['etf_code']]['net_flow'] += nt
                by_etf[d['etf_code']]['buy_count'] += 1
            elif action in SELL_ACTIONS:
                if code not in sell_map:
                    sell_map[code] = {
                        'stock_code': code, 'stock_name': d.get('stock_name') or code,
                        'total_nt': 0.0, 'delta_shares': 0.0, 'by_etf': []
                    }
                sell_map[code]['total_nt'] += nt
                sell_map[code]['delta_shares'] += delta
                sell_map[code]['by_etf'].append({
                    'etf_code': d['etf_code'], 'nt': round(nt, 0),
                    'kind': action
                })
                by_etf[d['etf_code']]['net_flow'] += nt
                by_etf[d['etf_code']]['sell_count'] += 1

        def add_etf_count(m: dict) -> list:
            return sorted(
                [dict(v, etf_count=len(v['by_etf'])) for v in m.values()],
                key=lambda x: -abs(x['total_nt'])
            )

        return add_etf_count(buy_map), add_etf_count(sell_map), dict(by_etf)

    @staticmethod
    def _compute_totals(inflow: list, outflow: list) -> dict:
        total_in = sum(s['total_nt'] for s in inflow)
        total_out = sum(abs(s['total_nt']) for s in outflow)
        return {
            'total_in_nt': round(total_in, 0),
            'total_out_nt': round(total_out, 0),
            'net_nt': round(total_in - total_out, 0),
            'stocks_count': len(inflow) + len(outflow),
        }

    @staticmethod
    def _upsert_flow(conn, target_date, etfs_covered, etfs_lagging, inflow, outflow, by_etf_map, totals) -> None:
        sql = text("""
            INSERT INTO etf_flow_daily
                (data_date, etfs_covered, etfs_lagging, inflow, outflow, by_etf, totals)
            VALUES
                (:data_date,
                 CAST(:etfs_covered AS text[]),
                 CAST(:etfs_lagging AS text[]),
                 CAST(:inflow AS jsonb),
                 CAST(:outflow AS jsonb),
                 CAST(:by_etf AS jsonb),
                 CAST(:totals AS jsonb))
            ON CONFLICT (data_date) DO UPDATE SET
                etfs_covered = EXCLUDED.etfs_covered,
                etfs_lagging = EXCLUDED.etfs_lagging,
                inflow       = EXCLUDED.inflow,
                outflow      = EXCLUDED.outflow,
                by_etf       = EXCLUDED.by_etf,
                totals       = EXCLUDED.totals
        """)
        conn.execute(sql, {
            "data_date": target_date,
            "etfs_covered": "{" + ",".join(etfs_covered) + "}",
            "etfs_lagging": "{" + ",".join(etfs_lagging) + "}",
            "inflow": json.dumps(inflow, ensure_ascii=False),
            "outflow": json.dumps(outflow, ensure_ascii=False),
            "by_etf": json.dumps(by_etf_map, ensure_ascii=False),
            "totals": json.dumps(totals, ensure_ascii=False),
        })

    @staticmethod
    def _write_cross_buy_signals(conn, inflow: list, target_date: str) -> None:
        """≥ 3 支 ETF 同日買入同股 → etf_signals (cross_etf_same_day_buy)"""
        candidates = [s for s in inflow if s.get('etf_count', 0) >= CROSS_BUY_MIN_ETFS]
        if not candidates:
            return

        sql = text("""
            INSERT INTO etf_signals
                (signal_type, stock_code, data_date, strength, etf_codes, metadata)
            VALUES
                ('cross_etf_same_day_buy', :stock_code, :data_date, :strength,
                 CAST(:etf_codes AS text[]),
                 CAST(:metadata AS jsonb))
            ON CONFLICT (signal_type, stock_code, data_date) DO UPDATE SET
                strength  = EXCLUDED.strength,
                etf_codes = EXCLUDED.etf_codes,
                metadata  = EXCLUDED.metadata
        """)

        for s in candidates:
            etf_list = [b['etf_code'] for b in s['by_etf']]
            conn.execute(sql, {
                "stock_code": s['stock_code'],
                "data_date": target_date,
                "strength": min(len(etf_list), 3),
                "etf_codes": "{" + ",".join(etf_list) + "}",
                "metadata": json.dumps({
                    "stock_name": s['stock_name'],
                    "etf_count": s['etf_count'],
                    "total_nt": s['total_nt'],
                }, ensure_ascii=False),
            })
