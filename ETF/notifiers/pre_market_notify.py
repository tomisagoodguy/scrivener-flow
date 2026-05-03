"""
Pre-Market Guide LINE Notification

每日從 etf_flow_daily 讀取最新資金流向，產生盤前指引 Flex Message bubble。
門檻對齊 reference/tw-active/tools/morning_post.py。
"""

import json
import logging
from datetime import date, timedelta
from typing import Any

from sqlalchemy import text

logger = logging.getLogger(__name__)

CONSENSUS_BUY_MIN = 4
CONSENSUS_SELL_MIN = 3
SINGLE_BET_MIN_NT = 300_000_000
BASKET_BUY_THRESHOLD = 0.5
MAX_SHOW_CONSENSUS = 5
MAX_SHOW_SINGLE = 3

_TOTAL_ETFS = 21


def nt_to_yi(nt: float) -> str:
    """Convert NTD amount to 億 string with sign prefix."""
    yi = abs(nt) / 1e8
    sign = "+" if nt >= 0 else "-"
    return f"{sign}{yi:.1f}億"


def fetch_latest_flow_row(engine) -> dict | None:
    """
    從 etf_flow_daily 讀最新一筆。
    data_date 超過 2 天（含今日）則視為過期，回傳 None。
    """
    try:
        with engine.connect() as conn:
            row = conn.execute(text("""
                SELECT data_date, etfs_covered, etfs_lagging,
                       inflow, outflow, by_etf, totals
                FROM etf_flow_daily
                ORDER BY data_date DESC
                LIMIT 1
            """)).fetchone()

        if row is None:
            logger.warning("etf_flow_daily is empty, skipping pre-market LINE notify")
            return None

        data_date_str = str(row.data_date)
        try:
            data_date = date.fromisoformat(data_date_str)
        except ValueError:
            logger.warning("etf_flow_daily data_date format unexpected: %s", data_date_str)
            return None

        if date.today() - data_date > timedelta(days=2):
            logger.warning(
                "etf_flow_daily latest record (%s) is older than 2 days, skipping",
                data_date_str,
            )
            return None

        def _parse(val: Any) -> Any:
            if isinstance(val, str):
                return json.loads(val)
            return val

        return {
            "data_date": data_date_str,
            "etfs_covered": list(row.etfs_covered or []),
            "etfs_lagging": list(row.etfs_lagging or []),
            "inflow": _parse(row.inflow) or [],
            "outflow": _parse(row.outflow) or [],
            "by_etf": _parse(row.by_etf) or {},
            "totals": _parse(row.totals) or {},
        }

    except Exception as e:
        logger.error("fetch_latest_flow_row failed: %s", e)
        return None


def build_pre_market_bubble(row: dict) -> dict:
    """產生盤前指引 LINE Flex Message bubble JSON。"""
    data_date = row["data_date"]
    etfs_covered = row["etfs_covered"]
    inflow: list[dict] = row["inflow"]
    outflow: list[dict] = row["outflow"]
    by_etf: dict = row["by_etf"]
    totals: dict = row["totals"]

    # 日期顯示 M/D
    try:
        d = date.fromisoformat(data_date)
        date_label = f"{d.month}/{d.day}"
    except ValueError:
        date_label = data_date

    n_covered = len(etfs_covered)
    header_text = f"盤前指引 · {date_label} · {n_covered}/{_TOTAL_ETFS} 家已揭露"

    body_contents: list[dict] = []

    # ── 共識買進 ──────────────────────────────────────────────
    consensus_buys = [s for s in inflow if s.get("etf_count", 0) >= CONSENSUS_BUY_MIN]
    if consensus_buys:
        body_contents.append(_section_title(f"共識買進（{len(consensus_buys)} 檔）", "#E74C3C"))
        for s in consensus_buys[:MAX_SHOW_CONSENSUS]:
            etf_codes = [b["etf_code"] for b in s.get("by_etf", []) if b.get("nt", 0) > 0]
            body_contents.append(_stock_row(
                s["stock_name"], s["stock_code"],
                nt_to_yi(s["total_nt"]),
                "、".join(etf_codes),
                "#E74C3C",
            ))

    # ── 集中加碼 ──────────────────────────────────────────────
    single_bets = [
        s for s in inflow
        if s.get("etf_count", 0) < CONSENSUS_BUY_MIN and s.get("total_nt", 0) >= SINGLE_BET_MIN_NT
    ]
    if single_bets:
        body_contents.append(_section_title("集中加碼", "#E67E22"))
        for s in single_bets[:MAX_SHOW_SINGLE]:
            etf_codes = [b["etf_code"] for b in s.get("by_etf", []) if b.get("nt", 0) > 0]
            body_contents.append(_stock_row(
                s["stock_name"], s["stock_code"],
                nt_to_yi(s["total_nt"]),
                "、".join(etf_codes),
                "#E67E22",
            ))

    # ── 共識賣出 ──────────────────────────────────────────────
    consensus_sells = [s for s in outflow if s.get("etf_count", 0) >= CONSENSUS_SELL_MIN]
    body_contents.append(_section_title("共識賣", "#27AE60"))
    if consensus_sells:
        for s in consensus_sells[:MAX_SHOW_CONSENSUS]:
            etf_codes = [b["etf_code"] for b in s.get("by_etf", []) if b.get("nt", 0) < 0]
            body_contents.append(_stock_row(
                s["stock_name"], s["stock_code"],
                nt_to_yi(s["total_nt"]),
                "、".join(etf_codes),
                "#27AE60",
            ))
    else:
        body_contents.append({
            "type": "text", "text": "無",
            "size": "sm", "color": "#888888",
        })

    # ── 淨流向摘要 ────────────────────────────────────────────
    net_nt = totals.get("net_nt", 0)
    total_in = totals.get("total_in_nt", 0)
    total_out = totals.get("total_out_nt", 0)
    net_color = "#E74C3C" if net_nt >= 0 else "#27AE60"

    body_contents.append({"type": "separator", "margin": "md"})
    body_contents.append({
        "type": "box", "layout": "horizontal", "margin": "sm",
        "contents": [
            {"type": "text", "text": "主動ETF淨流向", "size": "sm", "color": "#555555", "flex": 3},
            {"type": "text", "text": nt_to_yi(net_nt), "size": "sm",
             "color": net_color, "align": "end", "flex": 2, "weight": "bold"},
        ],
    })
    body_contents.append({
        "type": "box", "layout": "horizontal", "margin": "xs",
        "contents": [
            {"type": "text", "text": f"流入 {nt_to_yi(total_in)}  流出 -{nt_to_yi(abs(total_out))}",
             "size": "xs", "color": "#888888"},
        ],
    })

    # ── Basket Buy 警告 ───────────────────────────────────────
    if total_in > 0 and by_etf:
        dominant_code = max(by_etf, key=lambda k: by_etf[k].get("net_flow", 0))
        dominant_net = by_etf[dominant_code].get("net_flow", 0)
        if dominant_net > 0 and dominant_net / total_in > BASKET_BUY_THRESHOLD:
            pct = int(dominant_net / total_in * 100)
            body_contents.append({
                "type": "text",
                "text": f"⚠ {pct}% 來自 {dominant_code} basket buy 申購",
                "size": "xs", "color": "#E67E22", "margin": "sm", "wrap": True,
            })

    bubble = {
        "type": "bubble",
        "size": "kilo",
        "header": {
            "type": "box", "layout": "vertical",
            "backgroundColor": "#1A1A2E",
            "contents": [
                {"type": "text", "text": header_text,
                 "color": "#FFFFFF", "size": "sm", "weight": "bold", "wrap": True},
            ],
        },
        "body": {
            "type": "box", "layout": "vertical",
            "spacing": "sm", "paddingAll": "12px",
            "contents": body_contents,
        },
    }
    return bubble


# ── helpers ──────────────────────────────────────────────────────────────────

def _section_title(text: str, color: str) -> dict:
    return {
        "type": "text", "text": text,
        "size": "sm", "weight": "bold", "color": color, "margin": "md",
    }


def _stock_row(name: str, code: str, amount: str, etf_list: str, color: str) -> dict:
    label = f"{name} {code}  {amount}"
    if etf_list:
        label += f"  ({etf_list})"
    return {
        "type": "text", "text": label,
        "size": "xs", "color": color, "wrap": True,
    }
