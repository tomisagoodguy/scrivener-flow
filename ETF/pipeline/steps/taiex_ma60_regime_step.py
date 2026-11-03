"""
TAIEX MA60 Regime Step

每日計算加權指數季線（60 日均線）狀態與跌破事件分類，upsert 至 taiex_ma60_regime_daily。
跌破分三類：first_break（季線上揚且前 ≥40 日站上）、rebreak_rising（季線上揚但前 <40 日）、
break_falling（季線下彎）。各類事件的 20 日後歷史統計每日以全歷史重算，存 stats jsonb。
口徑對齊 2026-11-01 驗證過的研究（1999-01 ~ 2026-10-16：first_break 42 次、20 日中位數 +2.13%）。
屬輔助步驟，失敗不中斷 pipeline。
"""

import json
import math
from datetime import date
from typing import TYPE_CHECKING

import pandas as pd
from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep, StepDomain

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

MA_WINDOW = 60
SLOPE_LOOKBACK = 20
FIRST_BREAK_MIN_DAYS = 40
FORWARD_DAYS = 20
HISTORY_START = "1999-01-01"
BREAK_CLASSES = ("first_break", "rebreak_rising", "break_falling")
STATE_BY_BREAK = {
    "first_break": "below_after_first_break",
    "rebreak_rising": "below_after_rebreak",
    "break_falling": "below_ma_falling",
}


def compute_regime_frame(close: pd.Series, low: pd.Series) -> pd.DataFrame:
    """計算季線、斜率、連續站上天數與每日跌破分類。

    Args:
        close: 加權指數收盤（DatetimeIndex，遞增）。
        low: 加權指數盤中最低，與 close 同索引。

    Returns:
        欄位 close, low, ma60, ma60_slope20, ma_rising, days_above, prev_days_above, break_type。
        break_type 只在跌破日有值（first_break / rebreak_rising / break_falling），其餘為 None。
    """
    close = close.astype(float)
    ma = close.rolling(MA_WINDOW).mean()
    slope = ma - ma.shift(SLOPE_LOOKBACK)
    above = close > ma
    days_above = above.groupby((~above).cumsum()).cumsum().astype(int)
    prev_days_above = days_above.shift(1, fill_value=0).astype(int)

    is_break = (~above) & above.shift(1, fill_value=False) & slope.notna()
    rising = slope > 0
    break_type = pd.Series(None, index=close.index, dtype=object)
    break_type[is_break & ~rising] = "break_falling"
    break_type[is_break & rising & (prev_days_above >= FIRST_BREAK_MIN_DAYS)] = "first_break"
    break_type[is_break & rising & (prev_days_above < FIRST_BREAK_MIN_DAYS)] = "rebreak_rising"

    frame = pd.DataFrame(
        {
            "close": close,
            "low": low.reindex(close.index).astype(float),
            "ma60": ma,
            "ma60_slope20": slope,
            "ma_rising": rising,
            "days_above": days_above,
            "prev_days_above": prev_days_above,
        }
    )
    # 非跌破日保持 None（不是 NaN），寫入 TEXT 欄位才不會出錯
    frame["break_type"] = pd.Series(
        [bt if isinstance(bt, str) else None for bt in break_type], index=close.index, dtype=object
    )
    return frame


def _clean(value: float) -> float | None:
    return None if value is None or (isinstance(value, float) and math.isnan(value)) else float(value)


def _summarize(frame: pd.DataFrame, mask: pd.Series, include_back_above: bool) -> dict:
    close, low, ma = frame["close"], frame["low"], frame["ma60"]
    r1 = close.shift(-1) / close - 1
    r20 = close.shift(-FORWARD_DAYS) / close - 1
    # 第 1～20 日：反轉序列做 rolling，再位移一天排除事件當日
    min_low20 = low[::-1].rolling(FORWARD_DAYS, min_periods=FORWARD_DAYS).min()[::-1].shift(-1) / close - 1
    above = (close > ma).astype(float)
    back_above20 = above[::-1].rolling(FORWARD_DAYS, min_periods=1).max()[::-1].shift(-1) > 0

    events = frame.index[mask & r20.notna()]
    n = len(events)
    stats: dict = {
        "n": n,
        "next_day_up_rate": None,
        "median_r20": None,
        "mean_r20": None,
        "up_rate_r20": None,
        "back_above_within20": None,
        "median_min_low20": None,
        "count_min_low_below_5pct": None,
        "sample_start": None,
        "sample_end": None,
    }
    if n == 0:
        return stats
    stats.update(
        next_day_up_rate=_clean(float((r1[events] > 0).mean())),
        median_r20=_clean(float(r20[events].median())),
        mean_r20=_clean(float(r20[events].mean())),
        up_rate_r20=_clean(float((r20[events] > 0).mean())),
        median_min_low20=_clean(float(min_low20[events].median())),
        count_min_low_below_5pct=int((min_low20[events] < -0.05).sum()),
        sample_start=events[0].strftime("%Y-%m-%d"),
        sample_end=events[-1].strftime("%Y-%m-%d"),
    )
    if include_back_above:
        stats["back_above_within20"] = int(back_above20[events].sum())
    return stats


def compute_class_stats(frame: pd.DataFrame) -> dict[str, dict]:
    """三類跌破事件與收黑日基準的 20 日後歷史統計（只納入有完整 20 日後資料的事件）。"""
    stats = {cls: _summarize(frame, frame["break_type"] == cls, include_back_above=True) for cls in BREAK_CLASSES}
    down_day = frame["close"] < frame["close"].shift(1)
    stats["down_day"] = _summarize(frame, down_day, include_back_above=False)
    return stats


def build_daily_record(frame: pd.DataFrame, target: pd.Timestamp, stats: dict) -> dict:
    """組出 target 當日要寫入 taiex_ma60_regime_daily 的一列（Python 原生型別）。"""
    upto = frame.loc[:target]
    row = upto.iloc[-1]
    is_above = bool(row["close"] > row["ma60"])
    breaks = upto["break_type"].dropna()

    if is_above:
        state = "above"
    else:
        last_break = breaks.iloc[-1] if not breaks.empty else None
        state = STATE_BY_BREAK.get(last_break, "below_ma_falling")

    firsts = breaks[breaks == "first_break"]
    wave_break_count = int((breaks.index >= firsts.index[-1]).sum()) if not firsts.empty else None

    next_threshold: float | None = None
    next_type: str | None = None
    if is_above and len(upto) >= MA_WINDOW - 1:
        next_threshold = float(upto["close"].iloc[-(MA_WINDOW - 1):].mean())
        if not bool(row["ma_rising"]):
            next_type = "break_falling"
        elif int(row["days_above"]) >= FIRST_BREAK_MIN_DAYS:
            next_type = "first_break"
        else:
            next_type = "rebreak_rising"

    return {
        "date": upto.index[-1].strftime("%Y-%m-%d"),
        "close": float(row["close"]),
        "ma60": _clean(float(row["ma60"])),
        "ma60_slope20": _clean(float(row["ma60_slope20"])),
        "ma_rising": bool(row["ma_rising"]),
        "days_above": int(row["days_above"]),
        "break_type": row["break_type"] if isinstance(row["break_type"], str) else None,
        "state": state,
        "wave_break_count": wave_break_count,
        "next_break_threshold": next_threshold,
        "next_break_type": next_type,
        "stats": stats,
    }


class TaiexMa60RegimeStep(BaseStep):
    """計算加權指數季線狀態並 upsert 至 taiex_ma60_regime_daily（輔助步驟）"""

    @property
    def name(self) -> str:
        return "TAIEX MA60 Regime"

    @property
    def domain(self) -> StepDomain:
        return StepDomain.MARKET

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            self.logger.error(f"TaiexMa60RegimeStep failed: {e}")
        return ctx

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        import finlab.data as fd

        client = getattr(services.finlab_srv, "_client", None)
        if client and not client.login():
            self.logger.error("FinLab login failed, skipping TaiexMa60RegimeStep.")
            return

        close_df = fd.get("taiex_total_index:收盤指數")
        low_df = fd.get("taiex_total_index:最低指數")
        if close_df is None or close_df.empty or low_df is None or low_df.empty:
            self.logger.warning("taiex_total_index is empty, skipping TaiexMa60RegimeStep.")
            return

        target = pd.Timestamp(ctx.date_str or date.today().strftime("%Y-%m-%d"))
        close = pd.Series(pd.DataFrame(close_df).iloc[:, 0]).dropna()
        low = pd.Series(pd.DataFrame(low_df).iloc[:, 0])
        close = close[(close.index >= HISTORY_START) & (close.index <= target)]
        if len(close) < MA_WINDOW + SLOPE_LOOKBACK:
            self.logger.warning("TAIEX history insufficient for MA60 regime, skipping.")
            return
        if close.index[-1] != target:
            self.logger.info(f"No TAIEX data for {target.date()}, using last available: {close.index[-1].date()}")

        frame = compute_regime_frame(close, low)
        record = build_daily_record(frame, close.index[-1], compute_class_stats(frame))
        self.logger.info(
            f"TAIEX MA60 regime {record['date']}: state={record['state']}, "
            f"days_above={record['days_above']}, wave_break_count={record['wave_break_count']}"
        )
        self._upsert(record, services)

    def _upsert(self, record: dict, services: "PipelineServices") -> None:
        sql = text("""
            INSERT INTO taiex_ma60_regime_daily
                (date, close, ma60, ma60_slope20, ma_rising, days_above, break_type, state,
                 wave_break_count, next_break_threshold, next_break_type, stats, updated_at)
            VALUES
                (:date, :close, :ma60, :ma60_slope20, :ma_rising, :days_above, :break_type, :state,
                 :wave_break_count, :next_break_threshold, :next_break_type, CAST(:stats AS jsonb), NOW())
            ON CONFLICT (date) DO UPDATE SET
                close                = EXCLUDED.close,
                ma60                 = EXCLUDED.ma60,
                ma60_slope20         = EXCLUDED.ma60_slope20,
                ma_rising            = EXCLUDED.ma_rising,
                days_above           = EXCLUDED.days_above,
                break_type           = EXCLUDED.break_type,
                state                = EXCLUDED.state,
                wave_break_count     = EXCLUDED.wave_break_count,
                next_break_threshold = EXCLUDED.next_break_threshold,
                next_break_type      = EXCLUDED.next_break_type,
                stats                = EXCLUDED.stats,
                updated_at           = NOW()
        """)
        params = {**record, "stats": json.dumps(record["stats"], ensure_ascii=False)}
        with services.sql_storage.engine.connect() as conn:
            conn.execute(sql, params)
            conn.commit()
        self.logger.info(f"TAIEX MA60 regime upserted for {record['date']}.")
