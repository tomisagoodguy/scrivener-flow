"""
迴歸測試：FinancialsSync.run() 在登入失敗或抓到空資料時必須 raise，
不可 logger.error() + return 靜默結束，讓 GitHub Actions 回報「成功」卻沒寫入任何資料。

背景：2026-07-12 發現 equity_weekly.yml 排程「成功」但集保資料停在 2026-07-03
沒有更新，實際原因是 sync_stock_financials.py 在 FinLab 登入失敗 / 股權分散資料
為空時只 log error 就 return，process exit code 仍是 0，CI 因此誤判為成功。
"""
import pandas as pd
import pytest

from ETF.sync_stock_financials import FinancialsSync


class FakeStorage:
    def __init__(self, stock_list):
        self._stock_list = stock_list

    def get_all_target_stocks(self):
        return self._stock_list

    def get_strategy_hit_stocks(self, lookback_days: int = 30):
        return []


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
