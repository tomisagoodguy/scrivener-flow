"""
迴歸測試：FinancialsSync.run() 在登入失敗或抓到空資料時必須 raise，
不可 logger.error() + return 靜默結束，讓 GitHub Actions 回報「成功」卻沒寫入任何資料。

背景：2026-07-12 發現 equity_weekly.yml 排程「成功」但集保資料停在 2026-07-03
沒有更新，實際原因是 FinLab inventory 尚未提供 2026-07-10 一期，但 upsert 只比對
「FinLab 回傳 vs DB 已有」就 log「已是最新」並回報 CI 綠燈。
"""
import pandas as pd
import pytest

from ETF.sync_stock_financials import FinancialsSync, _check_shareholder_freshness


class FakeStorage:
    def __init__(self, stock_list):
        self._stock_list = stock_list

    def get_all_target_stocks(self):
        return self._stock_list

    def get_strategy_hit_stocks(self, lookback_days: int = 30):
        return []

    def upsert_shareholder_data(self, records):
        return {
            "written": 0,
            "skipped": len(records),
            "source_dates": sorted({r["data_date"] for r in records}),
            "new_dates": [],
            "db_max_date": "2026-07-03",
        }

    def cleanup_old_data(self):
        pass


class FakeFinlab:
    def __init__(self, login_ok=True, shareholder_df=None):
        self._login_ok = login_ok
        self._shareholder_df = shareholder_df if shareholder_df is not None else pd.DataFrame()

    def login(self):
        return self._login_ok

    def get_shareholder_data(self):
        return self._shareholder_df


def make_sync(finlab, storage) -> FinancialsSync:
    sync = FinancialsSync.__new__(FinancialsSync)
    sync.finlab = finlab
    sync.storage = storage
    return sync


def _make_inventory_df(dates, stock_code="1101"):
    rows = []
    for d in dates:
        rows.append(
            {
                "stock_id": stock_code,
                "date": d,
                "持股分級": 1,
                "人數": 100,
                "持有股數": 1000,
                "占集保庫存數比例": 1.0,
            }
        )
    return pd.DataFrame(rows)


def test_run_raises_when_finlab_login_fails():
    sync = make_sync(FakeFinlab(login_ok=False), FakeStorage(["1101"]))

    with pytest.raises(RuntimeError, match="Finlab 登入失敗"):
        sync.run(skip_broker=True, skip_revenue=True, skip_shareholder=False)


def test_run_raises_when_stock_list_empty():
    sync = make_sync(FakeFinlab(login_ok=True), FakeStorage([]))

    with pytest.raises(RuntimeError, match="無目標股票"):
        sync.run(skip_broker=True, skip_revenue=True, skip_shareholder=False)


def test_run_raises_when_shareholder_data_empty():
    sync = make_sync(
        FakeFinlab(login_ok=True, shareholder_df=pd.DataFrame()),
        FakeStorage(["1101"]),
    )

    with pytest.raises(RuntimeError, match="股權分散資料為空"):
        sync.run(skip_broker=True, skip_revenue=True, skip_shareholder=False)


def test_run_raises_when_finlab_lags_behind_expected_tdcc_week(monkeypatch):
    """FinLab 只到 7/3、DB 也是 7/3 時，週排程不可靜默成功。"""
    inv_df = _make_inventory_df(["2026-06-26", "2026-07-03"])
    sync = make_sync(FakeFinlab(login_ok=True, shareholder_df=inv_df), FakeStorage(["1101"]))
    monkeypatch.setattr(
        "ETF.utils.tdcc_schedule.expected_tdcc_friday",
        lambda today=None: __import__("datetime").date(2026, 7, 10),
    )

    with pytest.raises(RuntimeError, match="FinLab inventory 尚未提供 TDCC 新一期"):
        sync.run(skip_broker=True, skip_revenue=True, skip_shareholder=False)


def test_run_skips_finlab_when_db_already_fresh(monkeypatch):
    storage = FakeStorage(["1101"])
    storage.get_max_shareholder_date = lambda: "2026-07-10"
    sync = make_sync(FakeFinlab(login_ok=True, shareholder_df=pd.DataFrame()), storage)
    monkeypatch.setattr(
        "ETF.utils.tdcc_schedule.expected_tdcc_friday",
        lambda today=None: __import__("datetime").date(2026, 7, 10),
    )

    sync.run(
        skip_broker=True,
        skip_revenue=True,
        skip_shareholder=False,
        skip_if_fresh=True,
    )


def test_check_shareholder_freshness_ok_when_finlab_has_expected_week():
    _check_shareholder_freshness(
        {
            "written": 0,
            "source_dates": ["2026-07-03", "2026-07-10"],
            "db_max_date": "2026-07-03",
        }
    )
