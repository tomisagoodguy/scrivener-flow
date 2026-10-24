"""ETF 測試共用 fixture。"""

from datetime import date

import pytest

FROZEN_TDCC_TODAY = date(2026, 7, 10)  # 週五：TDCC 該週預期截止日即當天


@pytest.fixture
def frozen_tdcc_today(monkeypatch) -> date:
    """凍結 TDCC 排程時鐘（tdcc_schedule._today）為 2026-07-10。

    凍結的是唯一時鐘來源，expected_tdcc_friday() 與 is_tdcc_data_fresh() 的
    無參數呼叫都會跟著改變；不要改 patch expected_tdcc_friday（各模組以名稱
    import，patch 點不一致會漏網）。
    """
    monkeypatch.setattr("ETF.utils.tdcc_schedule._today", lambda: FROZEN_TDCC_TODAY)
    return FROZEN_TDCC_TODAY
