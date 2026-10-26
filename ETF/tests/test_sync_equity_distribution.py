"""
迴歸測試：main() 不應在「舊 snapshot_date 已涵蓋全部目標股票」時
就略過整個同步、完全不呼叫 FinLab。

背景：sync_equity_distribution.py 曾有一段「快速預檢」，只要 DB 既有的
最新 snapshot_date 已涵蓋全部目標股票，就直接 return，從不確認 FinLab
是否已有更新一期資料，導致集保統計永久卡在同一期不再更新。
"""
import sys

import pandas as pd
import pytest

from ETF import sync_equity_distribution as mod


class FakeStorage:
    def __init__(self, stock_list):
        self._stock_list = stock_list
        self.engine = None

    def get_all_target_stocks(self):
        return self._stock_list

    def get_max_equity_snapshot_date(self):
        return "2026-07-03"


@pytest.fixture
def fake_records():
    return [
        {"stock_code": "1101", "snapshot_date": "2026-07-11"},
        {"stock_code": "2330", "snapshot_date": "2026-07-11"},
    ]


def test_main_always_calls_finlab_even_if_previous_snapshot_fully_synced(
    monkeypatch, fake_records, frozen_tdcc_today
):
    stock_list = ["1101", "2330"]
    storage = FakeStorage(stock_list)

    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py"])

    login_mock = pytest.importorskip("unittest.mock").MagicMock(return_value=True)
    fetch_inventory_mock = pytest.importorskip("unittest.mock").MagicMock(
        return_value=pd.DataFrame({"stock_id": ["1101"], "date": ["2026-07-11"]})
    )
    monkeypatch.setattr(mod, "_login_finlab", login_mock)
    monkeypatch.setattr(mod, "_fetch_inventory", fetch_inventory_mock)
    monkeypatch.setattr(mod, "_compute_stats", lambda inv_df, sl: fake_records)
    # 模擬「本期新一期資料所有股票都已同步過」——這是唯一允許略過寫入的合法冪等保護
    monkeypatch.setattr(mod, "_get_synced_codes", lambda snapshot_date, storage: set(stock_list))
    monkeypatch.setattr(mod, "_enrich_stock_names", lambda records, storage: records)
    upsert_mock = pytest.importorskip("unittest.mock").MagicMock()
    monkeypatch.setattr(mod, "_upsert", upsert_mock)

    mod.main()

    # 修復前：這段「舊 snapshot 已全涵蓋」的情境會讓 main() 提早 return，
    # _login_finlab / _fetch_inventory 永遠不會被呼叫。
    login_mock.assert_called_once()
    fetch_inventory_mock.assert_called_once()


def test_main_raises_when_stock_list_empty(monkeypatch):
    """etf_holdings_snapshot 無資料時必須 raise，不可靜默 return 讓 CI 綠燈。"""
    storage = FakeStorage([])
    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py"])

    with pytest.raises(RuntimeError, match="etf_holdings_snapshot 無資料"):
        mod.main()


def test_main_raises_when_finlab_login_fails(monkeypatch):
    """FinLab 登入失敗時必須 raise，不可靜默 return 讓 CI 綠燈。"""
    stock_list = ["1101", "2330"]
    storage = FakeStorage(stock_list)
    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py"])
    monkeypatch.setattr(mod, "_login_finlab", lambda: False)

    with pytest.raises(RuntimeError, match="FinLab 登入失敗"):
        mod.main()


def test_main_raises_when_inventory_empty(monkeypatch):
    """FinLab inventory 資料為空（配額用盡等）時必須 raise，不可靜默 return 讓 CI 綠燈。"""
    stock_list = ["1101", "2330"]
    storage = FakeStorage(stock_list)
    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py"])
    monkeypatch.setattr(mod, "_login_finlab", lambda: True)
    monkeypatch.setattr(mod, "_fetch_inventory", lambda: pd.DataFrame())

    with pytest.raises(RuntimeError, match="inventory 資料為空"):
        mod.main()


def test_main_raises_when_snapshot_already_synced_but_finlab_lags(monkeypatch, frozen_tdcc_today):
    """FinLab 仍停在舊期、且該期股票都已同步時，不可靜默 return。"""
    stock_list = ["1101", "2330"]
    storage = FakeStorage(stock_list)
    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py"])
    monkeypatch.setattr(mod, "_login_finlab", lambda: True)
    monkeypatch.setattr(
        mod,
        "_fetch_inventory",
        lambda: pd.DataFrame({"stock_id": ["1101"], "date": ["2026-07-03"]}),
    )
    monkeypatch.setattr(
        mod,
        "_compute_stats",
        lambda inv_df, sl: [
            {"stock_code": "1101", "snapshot_date": "2026-07-03"},
            {"stock_code": "2330", "snapshot_date": "2026-07-03"},
        ],
    )
    monkeypatch.setattr(mod, "_get_synced_codes", lambda snapshot_date, storage: set(stock_list))

    with pytest.raises(RuntimeError, match="FinLab inventory 尚未提供 TDCC 新一期"):
        mod.main()


def test_main_does_not_raise_when_daily_topup_and_finlab_lags(monkeypatch, frozen_tdcc_today):
    """--daily-topup 模式下，FinLab 仍停在舊期時應靜默略過，不可 raise（daily job 每天誤報迴歸測試）。"""
    stock_list = ["1101", "2330"]
    storage = FakeStorage(stock_list)
    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py", "--daily-topup"])
    monkeypatch.setattr(mod, "_login_finlab", lambda: True)
    monkeypatch.setattr(
        mod,
        "_fetch_inventory",
        lambda: pd.DataFrame({"stock_id": ["1101"], "date": ["2026-07-03"]}),
    )
    monkeypatch.setattr(
        mod,
        "_compute_stats",
        lambda inv_df, sl: [
            {"stock_code": "1101", "snapshot_date": "2026-07-03"},
            {"stock_code": "2330", "snapshot_date": "2026-07-03"},
        ],
    )
    monkeypatch.setattr(mod, "_get_synced_codes", lambda snapshot_date, storage: set(stock_list))

    mod.main()  # 不應 raise


def test_main_skips_when_skip_if_fresh_and_db_current(monkeypatch, frozen_tdcc_today):
    storage = FakeStorage(["1101"])
    storage.get_max_equity_snapshot_date = lambda: "2026-07-10"
    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py", "--skip-if-fresh"])
    login_mock = pytest.importorskip("unittest.mock").MagicMock(return_value=True)
    monkeypatch.setattr(mod, "_login_finlab", login_mock)

    mod.main()

    login_mock.assert_not_called()


def test_main_raises_when_no_records_computed(monkeypatch):
    """_compute_stats 回傳空 list（資料不足兩期等）時必須 raise，不可靜默 return 讓 CI 綠燈。"""
    stock_list = ["1101", "2330"]
    storage = FakeStorage(stock_list)
    monkeypatch.setattr(mod, "SQLStorage", lambda: storage)
    monkeypatch.setattr(sys, "argv", ["sync_equity_distribution.py"])
    monkeypatch.setattr(mod, "_login_finlab", lambda: True)
    monkeypatch.setattr(
        mod, "_fetch_inventory", lambda: pd.DataFrame({"stock_id": ["1101"], "date": ["2026-07-11"]})
    )
    monkeypatch.setattr(mod, "_compute_stats", lambda inv_df, sl: [])

    with pytest.raises(RuntimeError, match="本期無可計算的統計資料"):
        mod.main()


def _inventory_rows(stock_id: str, date: str, total: int) -> list[dict]:
    return [
        {"stock_id": stock_id, "date": date, "tier": "17", "holder_count": total,
         "shares_held": 0, "custody_ratio": 100.0},
        {"stock_id": stock_id, "date": date, "tier": "12", "holder_count": 1,
         "shares_held": 0, "custody_ratio": 50.0},
    ]


def test_compute_stats_nulls_shareholders_rate_exceeding_numeric_8_4():
    """新上市股前期股東數極少 → 變化率 ≥ 10^4 會撐爆 NUMERIC(8,4)，應寫 NULL。"""
    rows = (
        _inventory_rows("1101", "2026-10-16", 1000)
        + _inventory_rows("1101", "2026-10-22", 990)
        + _inventory_rows("7777", "2026-10-16", 50)
        + _inventory_rows("7777", "2026-10-22", 8000)
        + _inventory_rows("8888", "2026-10-16", 0)
        + _inventory_rows("8888", "2026-10-22", 500)
    )
    records = {r["stock_code"]: r for r in mod._compute_stats(pd.DataFrame(rows), ["1101", "7777", "8888"])}

    assert records["1101"]["shareholders_change_rate"] == -1.0
    assert records["7777"]["shareholders_change_rate"] is None
    assert records["8888"]["shareholders_change_rate"] is None
    assert records["7777"]["total_shareholders"] == 8000
