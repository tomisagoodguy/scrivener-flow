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

        if date.today() - data_date > timedelta(days=3):
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


# ── 00981A 瑤姐 盤前指引 ─────────────────────────────────────────────────────

def fetch_981a_diff_row(engine) -> dict | None:
    """
    從 etf_diff_logs + etf_holdings_snapshot 讀取 00981A 最新一日加減碼資料。
    回傳 {"date_label": "M/D", "buys": [...], "new_in": [...], "sells": [...], "exits": [...]}
    """
    try:
        with engine.connect() as conn:
            latest = conn.execute(text("""
                SELECT data_date FROM etf_diff_logs
                WHERE etf_code = '00981A'
                ORDER BY data_date DESC LIMIT 1
            """)).fetchone()

            if latest is None:
                return None

            date_str = str(latest.data_date)

            logs = conn.execute(text("""
                SELECT stock_code, stock_name, change_type,
                       diff_shares, diff_weight, curr_weight, is_significant
                FROM etf_diff_logs
                WHERE etf_code = '00981A' AND data_date = :d
            """), {"d": date_str}).fetchall()

            prices = conn.execute(text("""
                SELECT stock_code, price
                FROM etf_holdings_snapshot
                WHERE etf_code = '00981A' AND data_date = :d AND price IS NOT NULL
            """), {"d": date_str}).fetchall()

        price_map = {r.stock_code: r.price for r in prices}

        def _entry(r):
            price = price_map.get(r.stock_code)
            shares_張 = round(abs(r.diff_shares) / 1000)
            amount_亿 = abs(r.diff_shares) * price / 1e8 if price else None
            return {
                "stock_code": r.stock_code,
                "stock_name": r.stock_name,
                "change_type": r.change_type,
                "diff_weight": r.diff_weight,
                "shares_張": shares_張,
                "amount_亿": amount_亿,
            }

        entries = [_entry(r) for r in logs]

        def _sort_key(e):
            return e["amount_亿"] if e["amount_亿"] is not None else e["shares_張"] / 1000

        buys  = sorted([e for e in entries if e["change_type"] == "BUY"],  key=_sort_key, reverse=True)
        new_in = sorted([e for e in entries if e["change_type"] == "IN"],  key=_sort_key, reverse=True)
        sells = sorted([e for e in entries if e["change_type"] in ("SELL", "CLOSE")], key=_sort_key, reverse=True)
        exits = [e for e in entries if e["change_type"] == "OUT"]

        if not buys and not new_in and not sells and not exits:
            return None

        try:
            d = date.fromisoformat(date_str)
            date_label = f"{d.month}/{d.day}"
        except ValueError:
            date_label = date_str

        return {"date_label": date_label, "buys": buys, "new_in": new_in, "sells": sells, "exits": exits}

    except Exception as e:
        logger.error("fetch_981a_diff_row failed: %s", e)
        return None


def _fmt_amount(e: dict, positive: bool) -> str:
    sign = "+" if positive else "-"
    a = e.get("amount_亿")
    if a is not None:
        if a >= 1:
            return f"{sign}{a:.2f}億"
        return f"{sign}{a * 1000:.0f}萬"
    return f"{sign}{e['shares_張']:,}張"


def build_981a_guide_bubble(row: dict) -> dict:
    """產生 00981A 瑤姐 加減碼 LINE Flex Message bubble。"""
    date_label = row["date_label"]
    buys: list[dict]  = row["buys"]
    new_in: list[dict] = row["new_in"]
    sells: list[dict] = row["sells"]
    exits: list[dict] = row["exits"]

    n_buy = len(buys) + len(new_in)
    n_sell = len(sells) + len(exits)

    body_contents: list[dict] = []

    def _add_section(title: str, entries: list[dict], color: str, positive: bool, badge: str = ""):
        if not entries:
            return
        body_contents.append(_section_title(f"{title}（{len(entries)}）", color))
        for e in entries[:10]:
            amount_str = _fmt_amount(e, positive)
            shares_str = f"{e['shares_張']:,}張"
            pp_str = f"{e['diff_weight']:+.2f}pp" if e.get("diff_weight") else ""
            label_parts = [f"{e['stock_name']} {e['stock_code']}", amount_str, shares_str]
            if pp_str:
                label_parts.append(pp_str)
            if badge:
                label_parts.append(badge)
            body_contents.append({
                "type": "text",
                "text": "  ".join(label_parts),
                "size": "xs", "color": color, "wrap": True,
            })
        if len(entries) > 10:
            body_contents.append({
                "type": "text",
                "text": f"...還有 {len(entries) - 10} 檔",
                "size": "xs", "color": "#888888", "align": "end",
            })

    _add_section("加碼", buys, "#C0392B", positive=True)
    _add_section("新建倉", new_in, "#E67E22", positive=True, badge="🆕")
    _add_section("減碼", sells, "#27AE60", positive=False)
    _add_section("出清", exits, "#7F8C8D", positive=False, badge="🚪")

    if not body_contents:
        body_contents.append({"type": "text", "text": "今日無明顯異動", "size": "sm", "color": "#888888"})

    return {
        "type": "bubble",
        "size": "kilo",
        "header": {
            "type": "box", "layout": "vertical",
            "backgroundColor": "#7C3AED",
            "contents": [
                {"type": "text",
                 "text": f"00981A 瑤姐 · {date_label} 加減碼",
                 "color": "#FFFFFF", "size": "sm", "weight": "bold", "wrap": True},
                {"type": "text",
                 "text": f"加 {n_buy}  ·  減 {n_sell}",
                 "color": "#FFFFFFAA", "size": "xs", "margin": "xs"},
            ],
        },
        "body": {
            "type": "box", "layout": "vertical",
            "spacing": "sm", "paddingAll": "12px",
            "contents": body_contents,
        },
        "footer": {
            "type": "box", "layout": "vertical",
            "contents": [{
                "type": "button",
                "action": {"type": "uri", "label": "查看選股池",
                           "uri": "https://scrivener-flow.vercel.app/investment"},
                "height": "sm", "style": "secondary",
            }],
        },
    }


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
