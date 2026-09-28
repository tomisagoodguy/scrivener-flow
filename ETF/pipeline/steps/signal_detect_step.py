"""
Signal Detect Step

偵測跨 ETF 進階訊號，寫入 etf_signals 表。

4 種訊號：
  1. multi_fund_consensus     — 同股被 >= 3 支 ETF 同日持有（strength 依 ETF 數遞增）
  2. single_fund_overweight   — 單支 ETF 個股比重 >= 5%（strength 依比重遞增）
  3. cross_product_accumulation — 同股在 >= 2 支 ETF 同日加碼（diff_logs SELL/IN 方向一致）
  4. weight_shift_5d          — 單支 ETF（限 00981A/00991A）近 5 個交易日持股比重累積變動
                                 ≥1pp（中期）/≥3pp（短期強訊號）；資料源為 etf_holdings_snapshot
                                 （非 etf_diff_logs，因後者只在股數有變動當日才有列）

屬於輔助步驟，失敗時只 log，不中斷 pipeline。
"""

import json
import logging
from datetime import date
from typing import Any

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep

logger = logging.getLogger(__name__)

# 閾值設定
CONSENSUS_MIN_ETFS = 3          # multi_fund_consensus 最少需幾支 ETF
OVERWEIGHT_PCT_THRESHOLD = 5.0  # single_fund_overweight 比重門檻（%）
ACCUMULATION_MIN_ETFS = 2       # cross_product_accumulation 最少需幾支 ETF

WEIGHT_SHIFT_5D_ETF_CODES = ("00981A", "00991A")  # weight_shift_5d 偵測範圍
WEIGHT_SHIFT_5D_LOOKBACK_DATES = 6                # 今日 + 5 個交易日前 = 6 個相異日期
WEIGHT_SHIFT_5D_MID_THRESHOLD = 1.0               # pp，中期訊號門檻（strength=1）
WEIGHT_SHIFT_5D_STRONG_THRESHOLD = 3.0            # pp，短期強訊號門檻（strength=2）


def _strength_from_count(count: int) -> int:
    """依持有 ETF 數計算訊號強度"""
    if count >= 7:
        return 3
    if count >= 5:
        return 2
    return 1


def _strength_from_weight(weight: float) -> int:
    """依個股比重計算訊號強度"""
    if weight >= 10.0:
        return 3
    if weight >= 7.0:
        return 2
    return 1


class SignalDetectStep(BaseStep):
    """偵測跨 ETF 訊號，upsert 至 etf_signals（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Signal Detect"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._detect_all(ctx, services)
        except Exception as e:
            self.logger.error(f"SignalDetectStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------ private

    def _detect_all(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        target_date = ctx.date_str or date.today().strftime("%Y-%m-%d")

        with services.sql_storage.engine.connect() as conn:
            holdings = self._fetch_holdings(conn, target_date)
            diff_logs = self._fetch_diff_logs(conn, target_date)
            weight_shift_snapshots = {
                etf_code: self._fetch_weight_shift_snapshots(conn, etf_code, target_date)
                for etf_code in WEIGHT_SHIFT_5D_ETF_CODES
            }

        signals: list[dict[str, Any]] = []
        signals.extend(self._multi_fund_consensus(holdings, target_date))
        signals.extend(self._single_fund_overweight(holdings, target_date))
        signals.extend(self._cross_product_accumulation(diff_logs, target_date))
        for etf_code, snapshot_rows in weight_shift_snapshots.items():
            signals.extend(self._weight_shift_5d(snapshot_rows, etf_code, target_date))

        if not signals:
            self.logger.info("No signals detected for %s", target_date)
            return

        self._upsert(services, signals)
        self.logger.info("Upserted %d signals for %s", len(signals), target_date)

    @staticmethod
    def _fetch_holdings(conn, target_date: str) -> list[dict]:
        rows = conn.execute(text("""
            SELECT etf_code, stock_code, stock_name, weight
            FROM etf_holdings_snapshot
            WHERE data_date = :d
        """), {"d": target_date})
        return [dict(r._mapping) for r in rows]

    @staticmethod
    def _fetch_diff_logs(conn, target_date: str) -> list[dict]:
        rows = conn.execute(text("""
            SELECT etf_code, stock_code, change_type, curr_weight
            FROM etf_diff_logs
            WHERE data_date = :d
              AND change_type IN ('BUY', 'IN', 'SELL', 'OUT')
        """), {"d": target_date})
        return [dict(r._mapping) for r in rows]

    @staticmethod
    def _fetch_weight_shift_snapshots(conn, etf_code: str, target_date: str) -> list[dict]:
        """取得 etf_code 在 target_date（含）以前最近 WEIGHT_SHIFT_5D_LOOKBACK_DATES 個
        相異 data_date 的完整持股快照（供 _weight_shift_5d 計算 5 日累積變動）。

        來源為 etf_holdings_snapshot，而非 etf_diff_logs：後者只在股數有變動當日才有列，
        無法可靠取得「N 個交易日前」的權重（見 advanced-signal-detection spec）。
        """
        rows = conn.execute(text("""
            SELECT stock_code, stock_name, weight, data_date
            FROM etf_holdings_snapshot
            WHERE etf_code = :etf_code
              AND data_date IN (
                  SELECT DISTINCT data_date
                  FROM etf_holdings_snapshot
                  WHERE etf_code = :etf_code AND data_date <= :d
                  ORDER BY data_date DESC
                  LIMIT :limit
              )
        """), {"etf_code": etf_code, "d": target_date, "limit": WEIGHT_SHIFT_5D_LOOKBACK_DATES})
        return [dict(r._mapping) for r in rows]

    def _multi_fund_consensus(self, holdings: list[dict], data_date: str) -> list[dict]:
        """stock 被 >= CONSENSUS_MIN_ETFS 支 ETF 持有"""
        stock_etfs: dict[str, list[str]] = {}
        stock_names: dict[str, str] = {}
        stock_weights: dict[str, dict[str, float]] = {}

        for h in holdings:
            code = h["stock_code"]
            if code not in stock_etfs:
                stock_etfs[code] = []
                stock_weights[code] = {}
            stock_etfs[code].append(h["etf_code"])
            stock_names[code] = h.get("stock_name") or code
            stock_weights[code][h["etf_code"]] = float(h["weight"] or 0)

        results = []
        for stock_code, etfs in stock_etfs.items():
            if len(etfs) < CONSENSUS_MIN_ETFS:
                continue
            results.append({
                "signal_type": "multi_fund_consensus",
                "stock_code": stock_code,
                "data_date": data_date,
                "strength": _strength_from_count(len(etfs)),
                "etf_codes": etfs,
                "metadata": {
                    "stock_name": stock_names[stock_code],
                    "etf_count": len(etfs),
                    "weights": stock_weights[stock_code],
                },
            })
        return results

    def _single_fund_overweight(self, holdings: list[dict], data_date: str) -> list[dict]:
        """單一 ETF 個股比重 >= OVERWEIGHT_PCT_THRESHOLD"""
        results = []
        for h in holdings:
            weight = float(h["weight"] or 0)
            if weight < OVERWEIGHT_PCT_THRESHOLD:
                continue
            results.append({
                "signal_type": "single_fund_overweight",
                "stock_code": h["stock_code"],
                "data_date": data_date,
                "strength": _strength_from_weight(weight),
                "etf_codes": [h["etf_code"]],
                "metadata": {
                    "stock_name": h.get("stock_name") or h["stock_code"],
                    "etf_code": h["etf_code"],
                    "weight": weight,
                },
            })
        return results

    def _cross_product_accumulation(self, diff_logs: list[dict], data_date: str) -> list[dict]:
        """同股在 >= ACCUMULATION_MIN_ETFS 支 ETF 同日加碼（BUY 或 IN）"""
        buy_map: dict[str, list[str]] = {}
        weight_map: dict[str, dict[str, float]] = {}

        for d in diff_logs:
            if d["change_type"] not in ("BUY", "IN"):
                continue
            code = d["stock_code"]
            if code not in buy_map:
                buy_map[code] = []
                weight_map[code] = {}
            buy_map[code].append(d["etf_code"])
            weight_map[code][d["etf_code"]] = float(d.get("curr_weight") or 0)

        results = []
        for stock_code, etfs in buy_map.items():
            if len(etfs) < ACCUMULATION_MIN_ETFS:
                continue
            results.append({
                "signal_type": "cross_product_accumulation",
                "stock_code": stock_code,
                "data_date": data_date,
                "strength": min(len(etfs), 3),
                "etf_codes": etfs,
                "metadata": {
                    "etf_count": len(etfs),
                    "weights_after": weight_map[stock_code],
                },
            })
        return results

    def _weight_shift_5d(
        self, snapshot_rows: list[dict], etf_code: str, data_date: str
    ) -> list[dict]:
        """近 5 個交易日持股比重累積變動（純函式）。

        snapshot_rows 須為單一 etf_code、最近 WEIGHT_SHIFT_5D_LOOKBACK_DATES 個相異
        data_date 的完整快照（由 _fetch_weight_shift_snapshots 提供）。相異日期不足，
        或個股未同時出現在「今日」與「5 個交易日前」兩份快照，皆靜默跳過該股票。
        """
        by_date: dict[str, dict[str, dict]] = {}
        for row in snapshot_rows:
            by_date.setdefault(row["data_date"], {})[row["stock_code"]] = row

        dates = sorted(by_date.keys(), reverse=True)  # 新到舊：dates[0] = 今日
        if len(dates) < WEIGHT_SHIFT_5D_LOOKBACK_DATES:
            return []

        today_map = by_date[dates[0]]
        past_map = by_date[dates[WEIGHT_SHIFT_5D_LOOKBACK_DATES - 1]]

        results = []
        for stock_code, today_row in today_map.items():
            past_row = past_map.get(stock_code)
            if past_row is None:
                continue

            weight_now = float(today_row["weight"] or 0)
            weight_5d_ago = float(past_row["weight"] or 0)
            delta_pp = round(weight_now - weight_5d_ago, 4)
            abs_delta = abs(delta_pp)

            if abs_delta < WEIGHT_SHIFT_5D_MID_THRESHOLD:
                continue

            strength = 2 if abs_delta >= WEIGHT_SHIFT_5D_STRONG_THRESHOLD else 1
            results.append({
                "signal_type": "weight_shift_5d",
                "stock_code": stock_code,
                "data_date": data_date,
                "strength": strength,
                "etf_codes": [etf_code],
                "metadata": {
                    "stock_name": today_row.get("stock_name") or stock_code,
                    "weight_5d_ago": weight_5d_ago,
                    "weight_now": weight_now,
                    "delta_pp": delta_pp,
                },
            })
        return results

    @staticmethod
    def _upsert(services: "PipelineServices", signals: list[dict]) -> None:
        sql = text("""
            INSERT INTO etf_signals
                (signal_type, stock_code, data_date, strength, etf_codes, metadata)
            VALUES
                (:signal_type, :stock_code, :data_date, :strength,
                 CAST(:etf_codes AS text[]),
                 CAST(:metadata AS jsonb))
            ON CONFLICT (signal_type, stock_code, data_date) DO UPDATE SET
                strength   = EXCLUDED.strength,
                etf_codes  = EXCLUDED.etf_codes,
                metadata   = EXCLUDED.metadata
        """)

        params = [
            {
                **s,
                "etf_codes": "{" + ",".join(s["etf_codes"]) + "}",
                "metadata": json.dumps(s["metadata"], ensure_ascii=False),
            }
            for s in signals
        ]
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, params)
            conn.commit()
