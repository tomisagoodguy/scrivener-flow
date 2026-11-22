"""INSERT ... ON CONFLICT 的 DO UPDATE 子句產生器（只在內容改變時才更新）。

PostgreSQL 的 UPDATE 即使值相同也會寫新 tuple、產生 WAL 與髒頁；pipeline 每日重抓
相同資料時會整批重寫。加上 `WHERE (目標表欄位) IS DISTINCT FROM (EXCLUDED 欄位)`
後，內容相同的衝突列直接跳過（NULL 與 NULL 視為相同）。
"""

from collections.abc import Sequence


def conflict_update_clause(
    table: str,
    columns: Sequence[str],
    touch: Sequence[str] = (),
) -> str:
    """產生 `DO UPDATE SET ... WHERE (...) IS DISTINCT FROM (...)` 子句。

    Args:
        table: 目標表名（若 INSERT 用 `AS alias` 則傳 alias），用於限定 WHERE 內的欄位。
        columns: 衝突時要更新、且用於比較是否改變的欄位，依序產生 SET 與比較清單。
        touch: 只在內容改變時設為 `NOW()` 的時間戳欄位，不列入比較。

    Returns:
        接在 `ON CONFLICT (<keys>)` 之後的子句文字。

    Raises:
        ValueError: `columns` 為空，或有欄位同時出現在 `columns` 與 `touch`。
    """
    if not columns:
        raise ValueError("conflict_update_clause: columns 不可為空")
    overlap = set(columns) & set(touch)
    if overlap:
        raise ValueError(f"conflict_update_clause: 欄位不可同時在 columns 與 touch：{sorted(overlap)}")

    assignments = [f"{c} = EXCLUDED.{c}" for c in columns] + [f"{t} = NOW()" for t in touch]
    target = ", ".join(f"{table}.{c}" for c in columns)
    incoming = ", ".join(f"EXCLUDED.{c}" for c in columns)
    return f"DO UPDATE SET {', '.join(assignments)} WHERE ({target}) IS DISTINCT FROM ({incoming})"
