"""
Signal Detect Step

偵測跨 ETF 進階訊號，寫入 etf_signals 表。

3 種 Phase 1 訊號：
  1. multi_fund_consensus     — 同股被 >= 3 支 ETF 同日持有（strength 依 ETF 數遞增）
  2. single_fund_overweight   — 單支 ETF 個股比重 >= 5%（strength 依比重遞增）
  3. cross_product_accumulation — 同股在 >= 2 支 ETF 同日加碼（diff_logs SELL/IN 方向一致）

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

        signals: list[dict[str, Any]] = []
        signals.extend(self._multi_fund_consensus(holdings, target_date))
        signals.extend(self._single_fund_overweight(holdings, target_date))
        signals.extend(self._cross_product_accumulation(diff_logs, target_date))

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
