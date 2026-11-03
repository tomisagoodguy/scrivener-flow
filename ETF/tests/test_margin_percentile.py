"""融資使用率全市場百分位測試（change: margin-usage-percentile-risk）。

涵蓋 spec：Daily margin usage percentile。
"""

import numpy as np
import pandas as pd
import pytest

from ETF.processors.margin_percentile import compute_margin_pct_rank

N_DAYS = 25
DATES = pd.bdate_range("2026-09-15", periods=N_DAYS)


def _frames(stocks: dict[str, tuple[float, float, float]]):
    """stocks: code -> (close, 每日成交金額, 融資使用率)，整段期間固定值。"""
    close = pd.DataFrame({c: [v[0]] * N_DAYS for c, v in stocks.items()}, index=DATES)
    amount = pd.DataFrame({c: [v[1]] * N_DAYS for c, v in stocks.items()}, index=DATES)
    margin = pd.DataFrame({c: [v[2]] * N_DAYS for c, v in stocks.items()}, index=DATES)
    return close, amount, margin


def _filler(n: int, start_margin: float = 1.0) -> dict[str, tuple[float, float, float]]:
    """n 檔合格股，代碼 5000 起、融資使用率 start_margin 起每檔 +1。"""
    return {str(5000 + i): (50.0, 1e8, start_margin + i) for i in range(n)}


class TestSpecExampleTable:
    """spec Example：合格判斷（當日合格股至少 50 檔）。"""

    @pytest.fixture
    def last_row(self) -> pd.Series:
        stocks = _filler(58)  # 融資使用率 1..58
        stocks.update(
            {
                "1101": (40.0, 8e7, 0.5),  # 合格，最低
                "2330": (1000.0, 9e9, 99.0),  # 合格，最高
                "2002": (8.0, 6e7, 25.0),  # 收盤 < 10
                "0050": (150.0, 5e9, 2.0),  # ETF 代碼
                "3008": (2000.0, 1e9, np.nan),  # 無融資資料
                "4444": (30.0, 4e7, 10.0),  # 20 日均額 < 5 千萬
                "910861": (30.0, 1e9, 10.0),  # 非四碼（DR）
            }
        )
        out = compute_margin_pct_rank(*_frames(stocks))
        return out.iloc[-1]

    def test_lowest_eligible(self, last_row):
        # 60 檔合格，最低者 1/60 = 1.67%
        assert last_row["1101"] == pytest.approx(1.7)

    def test_highest_eligible(self, last_row):
        assert last_row["2330"] == pytest.approx(100.0)

    def test_eightieth_percentile(self, last_row):
        # 融資使用率 47 的 filler（代碼 5046）在 60 檔中排第 48 → 80.0
        assert last_row["5046"] == pytest.approx(80.0)

    @pytest.mark.parametrize("code", ["2002", "0050", "3008", "4444", "910861"])
    def test_ineligible_is_nan(self, last_row, code):
        assert np.isnan(last_row[code])


def test_missing_margin_not_treated_as_zero():
    stocks = _filler(50, start_margin=1.0)
    stocks["3008"] = (2000.0, 1e9, np.nan)
    last = compute_margin_pct_rank(*_frames(stocks)).iloc[-1]
    # 若 NaN 被當 0 會加入母體（51 檔），最低者變 2/51；正確為 1/50 = 2.0
    assert last["5000"] == pytest.approx(2.0)
    assert np.isnan(last["3008"])


def test_population_below_50_all_nan():
    last = compute_margin_pct_rank(*_frames(_filler(49))).iloc[-1]
    assert last.isna().all()


def test_population_50_top_is_100():
    last = compute_margin_pct_rank(*_frames(_filler(50))).iloc[-1]
    assert last["5049"] == pytest.approx(100.0)
    assert last.notna().all()


def test_rolling_amount_needs_20_days():
    out = compute_margin_pct_rank(*_frames(_filler(50)))
    # 前 19 天 20 日均額尚未成形 → 全部不合格
    assert out.iloc[18].isna().all()
    assert out.iloc[19].notna().all()


def test_output_shape_matches_input():
    close, amount, margin = _frames(_filler(50))
    out = compute_margin_pct_rank(close, amount, margin)
    assert out.shape == close.shape
    assert list(out.columns) == list(close.columns)


class _FakeClient:
    """模擬 FinlabClient：依 DATA_MAP alias 回傳固定寬表。"""

    def __init__(self, frames: dict[str, pd.DataFrame]):
        self.frames = frames

    def login(self) -> bool:
        return True

    def get_data(self, key: str) -> pd.DataFrame:
        return self.frames.get(key, pd.DataFrame())


def _ohlcv_client() -> _FakeClient:
    stocks = _filler(50)
    stocks["2002"] = (8.0, 6e7, 25.0)  # 收盤 < 10 → 不合格
    close, amount, margin = _frames(stocks)
    return _FakeClient(
        {
            "close": close,
            "open": close,
            "high": close,
            "low": close,
            "volume": amount / close,
            "amount": amount,
            "margin_usage": margin,
            "it_buy": pd.DataFrame(0, index=close.index, columns=close.columns),
        }
    )


class TestOhlcvServiceMarginPctRank:
    def test_attaches_full_market_percentile(self):
        from ETF.services.finlab.ohlcv_service import OHLCVService

        df = OHLCVService(_ohlcv_client()).get(["5000", "2002"], days=5)
        assert "margin_pct_rank" in df.columns
        last = df[df["date"] == DATES[-1]].set_index("stock_id")
        # 母體是全市場 50 檔合格股（不是只有 stock_list 兩檔）：最低者 1/50
        assert last.loc["5000", "margin_pct_rank"] == pytest.approx(2.0)
        assert np.isnan(last.loc["2002", "margin_pct_rank"])
        # 融資使用率原欄位行為不變
        assert last.loc["2002", "margin_ratio"] == pytest.approx(25.0)

    def test_percentile_failure_keeps_ohlcv(self, monkeypatch):
        from ETF.services.finlab import ohlcv_service

        def boom(*_args, **_kwargs):
            raise RuntimeError("boom")

        monkeypatch.setattr(ohlcv_service, "compute_margin_pct_rank", boom)
        df = ohlcv_service.OHLCVService(_ohlcv_client()).get(["5000", "2002"], days=5)
        assert len(df) == 10
        assert df["close"].notna().all()
        assert df["margin_pct_rank"].isna().all()


class TestSaveStockPricesMarginPctRank:
    @pytest.fixture
    def captured(self, monkeypatch) -> list:
        from ETF.database import storage

        monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")
        payloads: list = []

        class _Resp:
            def raise_for_status(self) -> None:
                return None

        def fake_post(url, headers=None, json=None, **_kwargs):
            payloads.extend(json)
            return _Resp()

        monkeypatch.setattr(storage.requests, "post", fake_post)
        return payloads

    @staticmethod
    def _prices(with_rank: bool) -> pd.DataFrame:
        df = pd.DataFrame(
            {
                "stock_id": ["5000", "2002"],
                "date": [DATES[-1], DATES[-1]],
                "open": [50.0, 8.0],
                "high": [50.0, 8.0],
                "low": [50.0, 8.0],
                "close": [50.0, 8.0],
                "volume": [1000, 1000],
                "amount": [1e8, 6e7],
                "margin_ratio": [1.0, 25.0],
                "it_buy": [0, 0],
            }
        )
        if with_rank:
            df["margin_pct_rank"] = [2.0, np.nan]
        return df

    def test_writes_float_and_null(self, captured):
        from ETF.database.storage import ETFStorage

        ETFStorage().save_stock_prices(self._prices(with_rank=True))
        by_code = {r["stock_code"]: r for r in captured}
        assert by_code["5000"]["margin_pct_rank"] == pytest.approx(2.0)
        assert isinstance(by_code["5000"]["margin_pct_rank"], float)
        assert by_code["2002"]["margin_pct_rank"] is None

    def test_missing_column_writes_null(self, captured):
        from ETF.database.storage import ETFStorage

        ETFStorage().save_stock_prices(self._prices(with_rank=False))
        assert all(r["margin_pct_rank"] is None for r in captured)
