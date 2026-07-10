"""
Market Chips Step

市場籌碼日同步（輔助步驟）：四段依序執行，各段獨立 try、段錯誤記 log 續跑。

1. 期貨段：TAIFEX 三契約 × 三法人未平倉 + MXF/TMF 散戶多空比 → futures_institutional_daily
2. 融資融券段：TWSE MI_MARGN 市場合計 → market_margin_daily
3. 個股法人段：T86（上市）＋ TPEx（上櫃）個股淨額 → institutional_stock_daily
4. 訊號段：dual_buy / consecutive_buy / divergence ＋ ETF 加碼交叉標記 → institutional_signals

散戶多空比（只算 MXF/TMF，市場慣用定義）：
    散戶未平倉 = 全市場 OI − 三大法人 OI
    retail_ls_ratio = (散戶多單 − 散戶空單) / 全市場 OI × 100

全部段失敗時 step 標記失敗（raise），但屬非關鍵步驟，orchestrator 會記錄後繼續。
"""

import json
import logging
from typing import TYPE_CHECKING, Any

from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep, StepDomain

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

# 散戶多空比只對小台/微台有意義（大台散戶佔比低）
_MINI_CONTRACTS = ("MXF", "TMF")
# divergence：外資/投信淨額絕對值皆需進當日前 N 大
_DIVERGENCE_TOP_N = 50
# consecutive_buy：合計淨買超連續交易日門檻
_CONSECUTIVE_MIN_DAYS = 3
# consecutive_buy 回看窗口（交易日數，含當日）
_CONSECUTIVE_LOOKBACK_DAYS = 10

_CHUNK_SIZE = 3000


def compute_retail_rows(
    positions: list[dict[str, Any]],
    market_oi: dict[str, int],
) -> list[dict[str, Any]]:
    """從三法人部位與全市場 OI 推導 MXF/TMF 散戶彙總列。

    Args:
        positions: fetch_futures_positions 回傳的法人列
                   （contract/institution/long_oi/short_oi/net_oi）
        market_oi: fetch_market_oi 回傳的 {contract: 全市場 OI}

    Returns:
        institution='retail_summary' 的列（最多 2 筆，缺 market_oi 或法人列不足則跳過該契約）
    """
    rows: list[dict[str, Any]] = []
    for contract in _MINI_CONTRACTS:
        oi = market_oi.get(contract)
        inst = [p for p in positions if p["contract"] == contract]
        if not oi or len(inst) < 3:
            logger.warning(
                f"retail_summary skipped for {contract}: "
                f"market_oi={oi}, institution rows={len(inst)}"
            )
            continue
        inst_long = sum(p["long_oi"] for p in inst)
        inst_short = sum(p["short_oi"] for p in inst)
        retail_long = oi - inst_long
        retail_short = oi - inst_short
        ratio = (retail_long - retail_short) / oi * 100
        rows.append(
            {
                "contract": contract,
                "institution": "retail_summary",
                "long_oi": retail_long,
                "short_oi": retail_short,
                "net_oi": retail_long - retail_short,
                "market_oi": oi,
                "retail_ls_ratio": round(ratio, 4),
            }
        )
    return rows


def compute_dual_buy(day_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """雙法人同買：同日 foreign_net > 0 且 trust_net > 0。"""
    return [
        {
            "stock_code": r["stock_code"],
            "signal_type": "dual_buy",
            "metadata": {"foreign_net": r["foreign_net"], "trust_net": r["trust_net"]},
        }
        for r in day_rows
        if r["foreign_net"] > 0 and r["trust_net"] > 0
    ]


def compute_divergence(
    day_rows: list[dict[str, Any]],
    top_n: int = _DIVERGENCE_TOP_N,
) -> list[dict[str, Any]]:
    """法人分歧：外資/投信一正一負，且兩者絕對值各自進當日前 top_n 大。"""
    by_foreign = sorted(day_rows, key=lambda r: abs(r["foreign_net"]), reverse=True)
    by_trust = sorted(day_rows, key=lambda r: abs(r["trust_net"]), reverse=True)
    top_foreign = {r["stock_code"] for r in by_foreign[:top_n] if r["foreign_net"] != 0}
    top_trust = {r["stock_code"] for r in by_trust[:top_n] if r["trust_net"] != 0}
    return [
        {
            "stock_code": r["stock_code"],
            "signal_type": "divergence",
            "metadata": {"foreign_net": r["foreign_net"], "trust_net": r["trust_net"]},
        }
        for r in day_rows
        if r["foreign_net"] * r["trust_net"] < 0
        and r["stock_code"] in top_foreign
        and r["stock_code"] in top_trust
    ]


def compute_consecutive_buy(
    daily_rows: list[tuple[str, dict[str, dict[str, Any]]]],
    min_days: int = _CONSECUTIVE_MIN_DAYS,
) -> list[dict[str, Any]]:
    """法人連買：(foreign_net + trust_net) 連續 ≥ min_days 個交易日 > 0。

    連續性以「交易日」計（資料存在的日期序列），跨週末/假日不中斷。

    Args:
        daily_rows: [(date_str, {stock_code: row})]，依日期**由新到舊**排序，
                    第一筆為當日；日期序列即交易日序列。
        min_days: 連續門檻（含當日）。

    Returns:
        訊號列，metadata 含當日淨額、連買天數與合計淨額序列（新→舊）。
    """
    if len(daily_rows) < min_days:
        return []
    _, today_map = daily_rows[0]
    signals: list[dict[str, Any]] = []
    for code, today_row in today_map.items():
        streak = 0
        combined_series: list[int] = []
        for _, day_map in daily_rows:
            row = day_map.get(code)
            if row is None:
                break
            combined = row["foreign_net"] + row["trust_net"]
            if combined <= 0:
                break
            streak += 1
            combined_series.append(combined)
        if streak >= min_days:
            signals.append(
                {
                    "stock_code": code,
                    "signal_type": "consecutive_buy",
                    "metadata": {
                        "foreign_net": today_row["foreign_net"],
                        "trust_net": today_row["trust_net"],
                        "consecutive_days": streak,
                        "combined_series": combined_series,
                    },
                }
            )
    return signals


class MarketChipsStep(BaseStep):
    """市場籌碼四段同步（輔助步驟，段錯誤續跑）"""

    @property
    def name(self) -> str:
        return "Market Chips"

    @property
    def domain(self) -> StepDomain:
        return StepDomain.INTELLIGENCE

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        date_str = ctx.date_str
        segments = (
            ("futures", self._run_futures),
            ("margin", self._run_margin),
            ("institutional", self._run_institutional),
            ("signals", self._run_signals),
        )
        failures: list[str] = []
        for seg_name, seg_fn in segments:
            try:
                seg_fn(date_str, services)
            except Exception as e:
                logger.error(f"MarketChipsStep segment '{seg_name}' failed: {e}")
                failures.append(seg_name)
        if failures:
            logger.warning(f"MarketChipsStep segment failures: {failures}")
        if len(failures) == len(segments):
            # 全段失敗 → 標記 step 失敗；非關鍵步驟，orchestrator 記錄後繼續
            raise RuntimeError(f"All MarketChips segments failed: {failures}")
        return ctx

    # ── 段 1：期貨（含散戶多空比） ──────────────────────────────

    def _run_futures(self, date_str: str, services: "PipelineServices") -> None:
        from ETF.scrapers.taifex_scraper import fetch_futures_positions, fetch_market_oi

        positions = fetch_futures_positions(date_str)
        if not positions:
            logger.info(f"No TAIFEX futures data for {date_str}, segment skipped.")
            return
        market_oi = fetch_market_oi(date_str)
        rows = [dict(p, market_oi=None, retail_ls_ratio=None) for p in positions]
        rows.extend(compute_retail_rows(positions, market_oi))

        upsert_sql = text("""
            INSERT INTO futures_institutional_daily
            (data_date, contract, institution, long_oi, short_oi, net_oi, market_oi, retail_ls_ratio)
            VALUES (:data_date, :contract, :institution, :long_oi, :short_oi, :net_oi, :market_oi, :retail_ls_ratio)
            ON CONFLICT (data_date, contract, institution)
            DO UPDATE SET
                long_oi = EXCLUDED.long_oi,
                short_oi = EXCLUDED.short_oi,
                net_oi = EXCLUDED.net_oi,
                market_oi = EXCLUDED.market_oi,
                retail_ls_ratio = EXCLUDED.retail_ls_ratio,
                created_at = NOW()
        """)
        params = [dict(r, data_date=date_str) for r in rows]
        with services.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, params)
            conn.commit()
        logger.info(f"Futures segment saved {len(params)} rows for {date_str}.")

    # ── 段 2：融資融券 ─────────────────────────────────────────

    def _run_margin(self, date_str: str, services: "PipelineServices") -> None:
        from ETF.scrapers.twse_chips_scraper import fetch_margin

        margin = fetch_margin(date_str)
        if margin is None:
            logger.info(f"No MI_MARGN data for {date_str}, segment skipped.")
            return
        upsert_sql = text("""
            INSERT INTO market_margin_daily
            (data_date, margin_balance, margin_change, short_balance, short_change)
            VALUES (:data_date, :margin_balance, :margin_change, :short_balance, :short_change)
            ON CONFLICT (data_date)
            DO UPDATE SET
                margin_balance = EXCLUDED.margin_balance,
                margin_change = EXCLUDED.margin_change,
                short_balance = EXCLUDED.short_balance,
                short_change = EXCLUDED.short_change,
                created_at = NOW()
        """)
        with services.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, margin)
            conn.commit()
        logger.info(f"Margin segment saved 1 row for {date_str}.")

    # ── 段 3：個股法人 ─────────────────────────────────────────

    def _run_institutional(self, date_str: str, services: "PipelineServices") -> None:
        from ETF.scrapers.twse_chips_scraper import fetch_institutional

        records = fetch_institutional(date_str)
        if not records:
            logger.info(f"No institutional stock data for {date_str}, segment skipped.")
            return
        upsert_sql = text("""
            INSERT INTO institutional_stock_daily
            (data_date, stock_code, foreign_net, trust_net, dealer_net)
            VALUES (:data_date, :stock_code, :foreign_net, :trust_net, :dealer_net)
            ON CONFLICT (data_date, stock_code)
            DO UPDATE SET
                foreign_net = EXCLUDED.foreign_net,
                trust_net = EXCLUDED.trust_net,
                dealer_net = EXCLUDED.dealer_net,
                created_at = NOW()
        """)
        params = [dict(r, data_date=date_str) for r in records]
        with services.sql_storage.engine.connect() as conn:
            for i in range(0, len(params), _CHUNK_SIZE):
                conn.execute(upsert_sql, params[i : i + _CHUNK_SIZE])
            conn.commit()
        logger.info(f"Institutional segment saved {len(params)} rows for {date_str}.")

    # ── 段 4：訊號計算 ─────────────────────────────────────────

    def _run_signals(self, date_str: str, services: "PipelineServices") -> None:
        daily_rows = self._load_recent_rows(date_str, services)
        if not daily_rows or daily_rows[0][0] != date_str:
            logger.info(f"No institutional rows for {date_str}, signals segment skipped.")
            return

        today_rows = list(daily_rows[0][1].values())
        signals = (
            compute_dual_buy(today_rows)
            + compute_consecutive_buy(daily_rows)
            + compute_divergence(today_rows)
        )
        if not signals:
            logger.info(f"No signals detected for {date_str}.")
            return

        etf_cross_map = self._load_etf_cross(date_str, services)
        upsert_sql = text("""
            INSERT INTO institutional_signals
            (data_date, signal_type, stock_code, metadata, etf_cross)
            VALUES (:data_date, :signal_type, :stock_code, CAST(:metadata AS jsonb), :etf_cross)
            ON CONFLICT (data_date, signal_type, stock_code)
            DO UPDATE SET
                metadata = EXCLUDED.metadata,
                etf_cross = EXCLUDED.etf_cross,
                created_at = NOW()
        """)
        params = []
        for s in signals:
            etf_codes = etf_cross_map.get(s["stock_code"], [])
            metadata = {**s["metadata"], "etf_codes": etf_codes}
            params.append(
                {
                    "data_date": date_str,
                    "signal_type": s["signal_type"],
                    "stock_code": s["stock_code"],
                    "metadata": json.dumps(metadata),
                    "etf_cross": bool(etf_codes),
                }
            )
        with services.sql_storage.engine.connect() as conn:
            conn.execute(upsert_sql, params)
            conn.commit()
        counts = {
            t: sum(1 for p in params if p["signal_type"] == t)
            for t in ("dual_buy", "consecutive_buy", "divergence")
        }
        logger.info(f"Signals segment saved {len(params)} rows for {date_str}: {counts}")

    def _load_recent_rows(
        self, date_str: str, services: "PipelineServices"
    ) -> list[tuple[str, dict[str, dict[str, Any]]]]:
        """讀近 N 個交易日的個股法人列，回傳 [(date, {code: row})]，新→舊。"""
        sql = text("""
            SELECT data_date::text, stock_code, foreign_net, trust_net
            FROM institutional_stock_daily
            WHERE data_date <= :date AND data_date IN (
                SELECT DISTINCT data_date FROM institutional_stock_daily
                WHERE data_date <= :date
                ORDER BY data_date DESC
                LIMIT :lookback
            )
        """)
        by_date: dict[str, dict[str, dict[str, Any]]] = {}
        with services.sql_storage.engine.connect() as conn:
            for d, code, f_net, t_net in conn.execute(
                sql, {"date": date_str, "lookback": _CONSECUTIVE_LOOKBACK_DAYS}
            ):
                by_date.setdefault(d, {})[code] = {
                    "stock_code": code,
                    "foreign_net": int(f_net),
                    "trust_net": int(t_net),
                }
        return [(d, by_date[d]) for d in sorted(by_date, reverse=True)]

    def _load_etf_cross(
        self, date_str: str, services: "PipelineServices"
    ) -> dict[str, list[str]]:
        """當日 etf_diff_logs BUY/IN 的 {stock_code: [etf_code]}。"""
        sql = text("""
            SELECT stock_code, etf_code FROM etf_diff_logs
            WHERE data_date = :date AND change_type IN ('BUY', 'IN')
        """)
        cross: dict[str, list[str]] = {}
        with services.sql_storage.engine.connect() as conn:
            for code, etf in conn.execute(sql, {"date": date_str}):
                cross.setdefault(code, []).append(etf)
        return cross
