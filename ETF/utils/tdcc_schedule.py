"""TDCC 集保週資料排程輔助（FinLab inventory 上游延遲偵測）。"""

from datetime import date, timedelta


def expected_tdcc_friday(today: date | None = None) -> date:
    """回傳 TDCC 集保週資料預期最新截止日（當週或上週五）。"""
    today = today or date.today()
    days_since_friday = (today.weekday() - 4) % 7
    return today - timedelta(days=days_since_friday)


def is_tdcc_data_fresh(db_max_date: str | None, today: date | None = None) -> bool:
    """DB 最新集保期是否已達本週 TDCC 預期截止日。"""
    if not db_max_date:
        return False
    return db_max_date >= expected_tdcc_friday(today).isoformat()


def format_staleness_error(
    *,
    finlab_max: str,
    db_max: str | None,
    expected: str,
    retry_hint: str,
) -> str:
    return (
        f"FinLab inventory 尚未提供 TDCC 新一期：FinLab 最新 {finlab_max}，"
        f"DB 最新 {db_max or '（無）'}，預期至少 {expected}。"
        f" {retry_hint}"
    )
