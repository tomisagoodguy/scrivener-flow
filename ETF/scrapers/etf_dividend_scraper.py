"""ETF 配息記錄爬蟲 — TWSE ETF 分配收益 API

來源驗證：etf-market-mechanics 任務 1.1 spike（2026-07-11）
  GET https://www.twse.com.tw/rwd/zh/ETF/etfDiv?stkNo={code}&startDate=...&endDate=...&response=json
  fields: 證券代號/證券簡稱/除息交易日/收益分配基準日/收益分配發放日/
          收益分配金額(每1受益權益單位)/收益分配標準/公告年度（日期為民國年格式）

- period 由 ex_date 推導（YYYY-MM，來源無期別欄）
- yield_pct 來源未提供 → None
- 金額為 null（已公告除息日、金額未定）→ 跳過該筆，待金額確定後下次同步補上
"""

from __future__ import annotations

import json
import logging
import re
import ssl
import urllib.parse
import urllib.request
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)

# TWSE 憑證鏈缺 Subject Key Identifier，系統預設驗證失敗；
# 用 certifi 憑證包可正常驗證（與 twse_chips_scraper 同模式，非停用驗證）。
try:
    import certifi

    _SSL_CONTEXT: ssl.SSLContext | None = ssl.create_default_context(
        cafile=certifi.where()
    )
except ImportError:  # pragma: no cover - certifi 為既有相依套件
    _SSL_CONTEXT = None

_API_URL = "https://www.twse.com.tw/rwd/zh/ETF/etfDiv"
_UA = "Mozilla/5.0 (etf-pipeline-dividend; +scrivener-flow)"
# 涵蓋本專案最早的主動 ETF 上市日之前，回補與每日同步共用同一窗口（冪等 upsert）
_DEFAULT_START = "20240101"

_ROC_DATE_RE = re.compile(r"(\d+)年(\d+)月(\d+)日")


def _roc_date_to_iso(s: str) -> str | None:
    """民國年日期字串（115年07月02日）→ ISO（2026-07-02）；格式不符回 None。"""
    m = _ROC_DATE_RE.search(s or "")
    if not m:
        return None
    year = int(m.group(1)) + 1911
    return f"{year:04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"


def _parse_response(js: dict[str, Any]) -> list[dict[str, Any]]:
    """解析 etfDiv JSON 回應為 etf_dividend_records 記錄。

    row: [證券代號, 證券簡稱, 除息交易日, 基準日, 發放日, 金額, 分配標準, 公告年度]
    """
    records: list[dict[str, Any]] = []
    for row in js.get("data") or []:
        if len(row) < 6:
            continue
        ex_date = _roc_date_to_iso(str(row[2] or ""))
        amount_raw = row[5]
        if ex_date is None or amount_raw in (None, "", "null"):
            continue
        try:
            cash = float(str(amount_raw).replace(",", ""))
        except ValueError:
            continue
        records.append(
            {
                "etf_code": str(row[0]).strip(),
                "period": ex_date[:7],
                "cash_per_unit": cash,
                "ex_date": ex_date,
                "pay_date": _roc_date_to_iso(str(row[4] or "")),
                "yield_pct": None,
                "source": "twse_etfdiv",
            }
        )
    return records


def fetch_dividends(
    etf_code: str,
    start_date: str = _DEFAULT_START,
    end_date: str | None = None,
) -> list[dict[str, Any]]:
    """取得單一 ETF 的配息記錄。

    Args:
        etf_code: ETF 代號（如 "00984D"）。
        start_date: 查詢起日 YYYYMMDD。
        end_date: 查詢迄日 YYYYMMDD，None 表示今天。

    Returns:
        [{etf_code, period, cash_per_unit, ex_date, pay_date, yield_pct, source}]
        無配息記錄回空 list；HTTP / 解析錯誤則拋例外（由呼叫端逐 ETF 容錯）。
    """
    params = urllib.parse.urlencode(
        {
            "stkNo": etf_code,
            "startDate": start_date,
            "endDate": end_date or date.today().strftime("%Y%m%d"),
            "response": "json",
        }
    )
    req = urllib.request.Request(f"{_API_URL}?{params}", headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=30, context=_SSL_CONTEXT) as resp:
        js: dict[str, Any] = json.loads(resp.read().decode("utf-8"))

    if js.get("status") != "ok":
        # 「很抱歉，沒有符合條件的資料」等 → 視為無記錄，不報錯
        logger.info(
            "[TWSE etfDiv] %s status=%s，視為無配息記錄", etf_code, js.get("status")
        )
        return []
    return _parse_response(js)
