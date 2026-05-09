import pandas as pd
from typing import List, Dict, Any

# 最小顯著變動閾值（對齊 kevin12596 的 0.10%）
WEIGHT_CHANGE_THRESHOLD = 0.10
# 共識方向閾值：跨 ETF 共識加減碼計算用（比 is_significant 更細）
CONSENSUS_WEIGHT_THRESHOLD = 0.05
# 判定為 CLOSE 的減少幅度（股數歸零或減少超過 99%）
CLOSE_SHARES_RATIO = 0.99


def compute_diff(
    prev_df: pd.DataFrame,
    curr_df: pd.DataFrame,
    etf_code: str,
    data_date: str,
    weight_threshold: float = WEIGHT_CHANGE_THRESHOLD,
) -> List[Dict[str, Any]]:
    """
    比較前後兩份快照，產生持股異動 log。

    異動類型：
        IN    - 新進成分股（前日無，今日有）
        OUT   - 完全剔除（前日有，今日無）
        CLOSE - 股數歸零或減少 ≥ 99%（仍在清單但實質出場）
        BUY   - 增加持股，且絕對權重變動 ≥ weight_threshold
        SELL  - 減少持股，且絕對權重變動 ≥ weight_threshold
        TRIM  - 微調（股數有變但權重變動 < threshold），記錄但標記為不顯著

    prev_df / curr_df 需有欄位：code, name, shares, weight
    """
    logs: List[Dict[str, Any]] = []

    prev_map = prev_df.set_index("code").to_dict("index") if not prev_df.empty else {}
    curr_map = curr_df.set_index("code").to_dict("index") if not curr_df.empty else {}

    all_codes = set(prev_map.keys()) | set(curr_map.keys())

    for code in all_codes:
        p = prev_map.get(code)
        c = curr_map.get(code)

        # ── 1. IN：今日新進 ────────────────────────────────────────────────
        if p is None and c is not None:
            logs.append({
                "etf_code": etf_code,
                "data_date": data_date,
                "change_type": "IN",
                "stock_code": code,
                "stock_name": c["name"],
                "prev_shares": 0,
                "curr_shares": c["shares"],
                "diff_shares": c["shares"],
                "prev_weight": 0.0,
                "curr_weight": c["weight"],
                "diff_weight": c["weight"],
                "is_significant": True,
                "description": f"新進成分股: {c['name']} ({code})",
            })
            continue

        # ── 2. OUT：今日完全剔除 ────────────────────────────────────────────
        if p is not None and c is None:
            logs.append({
                "etf_code": etf_code,
                "data_date": data_date,
                "change_type": "OUT",
                "stock_code": code,
                "stock_name": p["name"],
                "prev_shares": p["shares"],
                "curr_shares": 0,
                "diff_shares": -p["shares"],
                "prev_weight": p["weight"],
                "curr_weight": 0.0,
                "diff_weight": -p["weight"],
                "is_significant": True,
                "description": f"剔除成分股: {p['name']} ({code})",
            })
            continue

        # ── 3. 共存：計算變動 ────────────────────────────────────────────────
        if p is not None and c is not None:
            diff_shares = c["shares"] - p["shares"]
            diff_weight = round(c["weight"] - p["weight"], 4)

            if diff_shares == 0:
                continue  # 無任何變動，跳過

            # CLOSE：股數歸零或大幅縮減（仍列在名單，但幾乎全出）
            if c["shares"] == 0 or (p["shares"] > 0 and diff_shares / p["shares"] <= -CLOSE_SHARES_RATIO):
                logs.append({
                    "etf_code": etf_code,
                    "data_date": data_date,
                    "change_type": "CLOSE",
                    "stock_code": code,
                    "stock_name": c["name"],
                    "prev_shares": p["shares"],
                    "curr_shares": c["shares"],
                    "diff_shares": diff_shares,
                    "prev_weight": p["weight"],
                    "curr_weight": c["weight"],
                    "diff_weight": diff_weight,
                    "is_significant": True,
                    "description": f"近乎清倉: {c['name']} ({code}) 持股縮減 {abs(diff_shares / p['shares']) * 100:.1f}%",
                })
                continue

            abs_weight_change = abs(diff_weight)
            is_significant = abs_weight_change >= weight_threshold

            if diff_shares > 0:
                change_type = "BUY"
                desc = f"加碼: {c['name']} ({code}) +{diff_shares:,}股 ({diff_weight:+.2f}%)"
            else:
                change_type = "SELL" if is_significant else "TRIM"
                desc = f"{'減碼' if is_significant else '微調'}: {c['name']} ({code}) {diff_shares:,}股 ({diff_weight:+.2f}%)"

            logs.append({
                "etf_code": etf_code,
                "data_date": data_date,
                "change_type": change_type,
                "stock_code": code,
                "stock_name": c["name"],
                "prev_shares": p["shares"],
                "curr_shares": c["shares"],
                "diff_shares": diff_shares,
                "prev_weight": p["weight"],
                "curr_weight": c["weight"],
                "diff_weight": diff_weight,
                "is_significant": is_significant,
                "description": desc,
            })

    return logs


def filter_significant(logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """只保留顯著異動（IN / OUT / CLOSE / 大幅 BUY or SELL）"""
    return [log for log in logs if log.get("is_significant", False)]
