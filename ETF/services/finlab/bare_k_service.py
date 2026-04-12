"""
BareK Service

計算裸K看盤六面板所需的指標快照。
邏輯等價於 EOCS/裸K看盤.ipynb 中的 StockAnalyzer._build_fig()。
"""

import logging
from typing import Any

import numpy as np
import pandas as pd

from ETF.services.finlab.client import FinlabClient

logger = logging.getLogger(__name__)

# 預定義策略標籤（與前端保持一致）
STRATEGY_LABELS = ["創260高", "低波動", "融資健康", "營收9月高", "投信買超"]


class BareKService:
    """
    裸K六面板指標計算服務。

    職責：
    - 從 FinLab 抓取全市場資料（單例快取）
    - 對單一股票計算六個面板指標
    - 回傳可直接存入 bare_k_snapshots 的 JSONB 結構
    """

    def __init__(self, client: FinlabClient | None = None):
        self.client = client or FinlabClient()
        self._global_data_loaded = False
        # 全市場寬表（由 _ensure_global_data 填入）
        self._close: pd.DataFrame = pd.DataFrame()
        self._open: pd.DataFrame = pd.DataFrame()
        self._high: pd.DataFrame = pd.DataFrame()
        self._low: pd.DataFrame = pd.DataFrame()
        self._volume: pd.DataFrame = pd.DataFrame()
        self._margin: pd.DataFrame = pd.DataFrame()
        self._rev: pd.DataFrame = pd.DataFrame()
        self._yoy: pd.DataFrame = pd.DataFrame()
        self._mom: pd.DataFrame = pd.DataFrame()
        self._trust: pd.DataFrame = pd.DataFrame()
        self._inv: pd.DataFrame = pd.DataFrame()
        self._company_map: dict[str, str] = {}

    # ──────────────────────────────────────────────────────────────────────
    # 公開 API
    # ──────────────────────────────────────────────────────────────────────

    def ensure_global_data(self) -> bool:
        """
        預載全市場資料（幂等，多次呼叫只載入一次）。

        Returns:
            True 代表成功登入並取得資料，False 代表失敗
        """
        if self._global_data_loaded:
            return True

        if not self.client.login():
            return False

        logger.info("Loading global FinLab data for BareKService...")
        self._close = self.client.get_data("close")
        if self._close.empty:
            logger.error("Failed to load close price data.")
            return False

        self._open = self.client.get_data("open")
        self._high = self.client.get_data("high")
        self._low = self.client.get_data("low")
        self._volume = self.client.get_data("volume")
        self._margin = self.client.get_data("margin_usage")
        self._rev = self.client.get_data("monthly_revenue")
        self._yoy = self.client.get_data("monthly_revenue_yoy")
        self._mom = self.client.get_data("revenue_mom")
        self._trust = self.client.get_data("it_buy")
        self._inv = self.client.get_data("inventory")

        # 公司名稱對照表
        try:
            co = self.client.get_data("company_info")
            if not co.empty:
                self._company_map = dict(zip(co["stock_id"].astype(str), co["公司簡稱"]))
        except Exception as e:
            logger.warning(f"Unable to load company_map: {e}")

        self._global_data_loaded = True
        logger.info("Global data loaded successfully.")
        return True

    def compute_snapshot(self, sid: str, days: int = 240) -> dict[str, Any] | None:
        """
        計算單一股票的裸K六面板快照。

        Args:
            sid: 股票代碼（e.g. "2330"）
            days: 顯示天數（240 日）

        Returns:
            dict 結構符合 bare_k_snapshots 欄位，或 None（資料不足時）
        """
        if not self.ensure_global_data():
            return None

        if sid not in self._close.columns:
            logger.warning(f"Stock {sid} not found in FinLab close data, skipping.")
            return None

        # ── 取 buffer（260 + days 行）供計算 260 日高與長週期均線 ──
        buf_size = days + 300
        c_all = self._close[sid].dropna()
        if len(c_all) < 60:
            logger.warning(f"Stock {sid} has insufficient history ({len(c_all)} days), skipping.")
            return None

        buf = c_all.tail(buf_size)
        c = buf.tail(days)
        idx = c.index

        # ── Panel 1: OHLCV ──
        ohlcv = self._build_ohlcv(sid, c, idx, buf)

        # ── Panel 1: 均線與 260 日高 ──
        mas = self._build_mas(buf, idx)

        # ── Panel 2: 訊號條件 ──
        signals, signal_flags = self._build_signals(sid, c, buf, idx, mas)

        # ── Panel 4: 融資維持率 ──
        margin = self._build_margin(sid, idx)

        # ── Panel 5: 月營收 YOY/MOM ──
        revenue = self._build_revenue(sid, idx)

        # ── Panel 6: 集保籌碼 ──
        inv_chips = self._build_inv_chips(sid, idx)

        # ── Summary（供總覽卡片顯示） ──
        summary = self._build_summary(sid, c, mas, signal_flags, margin, revenue, inv_chips)

        return {
            "ohlcv": ohlcv,
            "mas": mas,
            "signals": signals,
            "margin": margin,
            "revenue": revenue,
            "inv_chips": inv_chips,
            "summary": summary,
        }

    def get_company_name(self, sid: str) -> str:
        """回傳公司簡稱，找不到時回傳空字串"""
        self.ensure_global_data()
        return self._company_map.get(sid, "")

    # ──────────────────────────────────────────────────────────────────────
    # 私有計算方法
    # ──────────────────────────────────────────────────────────────────────

    def _build_ohlcv(
        self,
        sid: str,
        c: pd.Series,
        idx: pd.DatetimeIndex,
        buf: pd.Series,
    ) -> list[dict]:
        o = self._open[sid].reindex(idx) if sid in self._open.columns else pd.Series(np.nan, index=idx)
        h = self._high[sid].reindex(idx) if sid in self._high.columns else pd.Series(np.nan, index=idx)
        l = self._low[sid].reindex(idx) if sid in self._low.columns else pd.Series(np.nan, index=idx)
        v = self._volume[sid].reindex(idx) if sid in self._volume.columns else pd.Series(np.nan, index=idx)

        # 前日收盤（供計算漲跌幅）
        prev_close = buf.shift(1).reindex(idx)

        records = []
        for date in idx:
            date_str = str(date)[:10]
            cv = float(c.get(date, np.nan))
            ov = float(o.get(date, np.nan))
            hv = float(h.get(date, np.nan))
            lv = float(l.get(date, np.nan))
            vv = float(v.get(date, np.nan))
            pv = float(prev_close.get(date, np.nan))
            change_pct = round((cv / pv - 1) * 100, 2) if (not np.isnan(cv) and not np.isnan(pv) and pv != 0) else None
            records.append({
                "date": date_str,
                "o": round(ov, 2) if not np.isnan(ov) else None,
                "h": round(hv, 2) if not np.isnan(hv) else None,
                "l": round(lv, 2) if not np.isnan(lv) else None,
                "c": round(cv, 2) if not np.isnan(cv) else None,
                "v": int(vv) if not np.isnan(vv) else None,
                "change_pct": change_pct,
            })
        return records

    def _build_mas(self, buf: pd.Series, idx: pd.DatetimeIndex) -> dict[str, list]:
        ma_periods = [5, 20, 60, 120]
        result: dict[str, list] = {}
        for p in ma_periods:
            ma = buf.rolling(p).mean().reindex(idx)
            result[f"ma{p}"] = [
                {"date": str(d)[:10], "value": round(float(v), 2) if not np.isnan(v) else None}
                for d, v in ma.items()
            ]
        # 260 日高
        h260 = buf.rolling(260, min_periods=130).max().reindex(idx)
        result["h260"] = [
            {"date": str(d)[:10], "value": round(float(v), 2) if not np.isnan(v) else None}
            for d, v in h260.items()
        ]
        result["h260_series"] = h260  # 供 _build_signals 內部使用（不存入 DB）
        return result

    def _build_signals(
        self,
        sid: str,
        c: pd.Series,
        buf: pd.Series,
        idx: pd.DatetimeIndex,
        mas: dict,
    ) -> tuple[list[dict], dict[str, bool]]:
        """回傳 (每日訊號列表, 最後一日各條件布林)"""
        h260 = mas.pop("h260_series")  # 取出後從 mas 移除（不存 DB）

        # 低波動：蠟燭體積 < 10%
        o_buf = self._open[sid].reindex(buf.index) if sid in self._open.columns else buf
        h_buf = self._high[sid].reindex(buf.index) if sid in self._high.columns else buf
        l_buf = self._low[sid].reindex(buf.index) if sid in self._low.columns else buf
        is_up = buf >= o_buf
        bv_up = (abs(buf.shift(1) - o_buf) + abs(o_buf - l_buf) + abs(l_buf - h_buf) + abs(h_buf - buf))
        bv_dn = (abs(buf.shift(1) - o_buf) + abs(o_buf - h_buf) + abs(h_buf - l_buf) + abs(l_buf - buf))
        candle_vol = (
            (bv_up.where(is_up, bv_dn).rolling(20).mean() / buf.rolling(20).mean() * 100).reindex(idx)
        )

        # 融資健康
        margin_d = (
            self._margin[sid].reindex(idx, method="ffill").fillna(0)
            if sid in self._margin.columns
            else pd.Series(0.0, index=idx)
        )
        margin_ok = (margin_d > 2) & (margin_d < 40)

        # 營收9月高
        if sid in self._rev.columns:
            rev_s = self._rev[sid].dropna()
            rev_ma2 = rev_s.rolling(2, min_periods=1).mean()
            rev_9max = rev_ma2.rolling(9, min_periods=6).max()
            rev_daily = (rev_ma2 >= rev_9max * 0.999).reindex(idx, method="ffill").fillna(False)
        else:
            rev_daily = pd.Series(False, index=idx)

        # 投信買超（10 日累計）
        if sid in self._trust.columns:
            trust_10 = (self._trust[sid] / 1000).rolling(10).sum().reindex(idx, method="ffill").fillna(0)
            trust_ok = trust_10 > 0
        else:
            trust_ok = pd.Series(False, index=idx)

        # 創260高
        hit_260 = c >= h260 * 0.995
        # 低波動
        low_vol_flag = candle_vol.fillna(99) < 10

        records = []
        for date in idx:
            date_str = str(date)[:10]
            records.append({
                "date": date_str,
                "hit260": bool(hit_260.get(date, False)),
                "low_vol": bool(low_vol_flag.get(date, False)),
                "margin_ok": bool(margin_ok.get(date, False)),
                "rev_9max": bool(rev_daily.get(date, False)),
                "trust_ok": bool(trust_ok.get(date, False)),
            })

        last_flags = {
            "hit260": bool(hit_260.iloc[-1]) if len(hit_260) else False,
            "low_vol": bool(low_vol_flag.iloc[-1]) if len(low_vol_flag) else False,
            "margin_ok": bool(margin_ok.iloc[-1]) if len(margin_ok) else False,
            "rev_9max": bool(rev_daily.iloc[-1]) if len(rev_daily) else False,
            "trust_ok": bool(trust_ok.iloc[-1]) if len(trust_ok) else False,
        }

        return records, last_flags

    def _build_margin(self, sid: str, idx: pd.DatetimeIndex) -> list[dict]:
        margin_d = (
            self._margin[sid].reindex(idx, method="ffill").fillna(0)
            if sid in self._margin.columns
            else pd.Series(0.0, index=idx)
        )
        return [
            {"date": str(d)[:10], "rate": round(float(v), 2)}
            for d, v in margin_d.items()
        ]

    def _build_revenue(self, sid: str, idx: pd.DatetimeIndex) -> list[dict]:
        yoy_d = (
            self._yoy[sid].reindex(idx, method="ffill").fillna(0)
            if sid in self._yoy.columns
            else pd.Series(0.0, index=idx)
        )
        mom_d = (
            self._mom[sid].reindex(idx, method="ffill").fillna(0)
            if sid in self._mom.columns
            else pd.Series(0.0, index=idx)
        )
        return [
            {"date": str(d)[:10], "yoy": round(float(y), 2), "mom": round(float(m), 2)}
            for (d, y), (_, m) in zip(yoy_d.items(), mom_d.items())
        ]

    def _build_inv_chips(self, sid: str, idx: pd.DatetimeIndex) -> list[dict]:
        """集保籌碼：大戶（11–15 級）vs 散戶（1–4 級）週頻持股比 diff"""
        nan_series = pd.Series(0.0, index=idx)
        pr_series = pd.Series(0.0, index=idx)

        if self._inv.empty or sid not in self._close.columns:
            return [
                {"date": str(d)[:10], "big_chg": 0.0, "small_chg": 0.0, "pr_rank": 0.0}
                for d in idx
            ]

        try:
            cols = list(self._inv.columns[:6])
            INV_SYM, INV_DATE, INV_BUCKET = cols[0], cols[1], cols[2]
            INV_RATIO = cols[5]

            mask = self._inv[INV_SYM].astype(str) == str(sid)
            if not mask.any():
                return [
                    {"date": str(d)[:10], "big_chg": 0.0, "small_chg": 0.0, "pr_rank": 0.0}
                    for d in idx
                ]

            sub = self._inv[mask]
            level = sub[INV_BUCKET].astype(int)

            big_sub = sub[(level >= 11) & (level <= 15)]
            small_sub = sub[(level >= 1) & (level <= 4)]

            big_ratio = big_sub.groupby(INV_DATE)[INV_RATIO].sum()
            small_ratio = small_sub.groupby(INV_DATE)[INV_RATIO].sum()

            big_chg = big_ratio.diff(1).reindex(idx).ffill().fillna(0)
            small_chg = small_ratio.diff(1).reindex(idx).ffill().fillna(0)

            # PR rank（全市場相對強度）
            try:
                INV_SHARES = cols[4]
                full_level = self._inv[INV_BUCKET].astype(int)
                h1 = self._inv[full_level <= 4].pivot_table(
                    index=INV_DATE, columns=INV_SYM, values=INV_SHARES, aggfunc="sum", observed=False
                )
                h2 = self._inv[(full_level >= 11) & (full_level <= 15)].pivot_table(
                    index=INV_DATE, columns=INV_SYM, values=INV_SHARES, aggfunc="sum", observed=False
                )
                if sid in h1.columns and sid in h2.columns:
                    ratio = h2 / (h1 + h2)
                    pr = ratio.diff(6).rank(axis=1, pct=True) * 100
                    if sid in pr.columns:
                        pr_series = pr[sid].reindex(idx, method="ffill").fillna(0)
            except Exception as e:
                logger.debug(f"PR rank calculation failed for {sid}: {e}")

        except Exception as e:
            logger.warning(f"inv_chips calculation failed for {sid}: {e}")
            big_chg = nan_series
            small_chg = nan_series

        records = []
        for date in idx:
            records.append({
                "date": str(date)[:10],
                "big_chg": round(float(big_chg.get(date, 0.0)), 4),
                "small_chg": round(float(small_chg.get(date, 0.0)), 4),
                "pr_rank": round(float(pr_series.get(date, 0.0)), 1),
            })
        return records

    def _build_summary(
        self,
        sid: str,
        c: pd.Series,
        mas: dict,
        signal_flags: dict[str, bool],
        margin: list[dict],
        revenue: list[dict],
        inv_chips: list[dict],
    ) -> dict:
        last_close = float(c.iloc[-1]) if len(c) else 0.0
        prev_close = float(c.iloc[-2]) if len(c) >= 2 else last_close
        change_pct = round((last_close / prev_close - 1) * 100, 2) if prev_close != 0 else 0.0

        h260_last = mas["h260"][-1]["value"] if mas.get("h260") else None
        dist_260_pct = (
            round((last_close / h260_last - 1) * 100, 2)
            if h260_last and h260_last != 0
            else None
        )

        return {
            "stock_id": sid,
            "name": self._company_map.get(sid, ""),
            "last_price": round(last_close, 2),
            "change_pct": change_pct,
            "dist_260_pct": dist_260_pct,
            "signals": signal_flags,
            "last_yoy": revenue[-1]["yoy"] if revenue else None,
            "last_mom": revenue[-1]["mom"] if revenue else None,
            "last_margin": margin[-1]["rate"] if margin else None,
            "last_big_chg": inv_chips[-1]["big_chg"] if inv_chips else None,
            "last_pr_rank": inv_chips[-1]["pr_rank"] if inv_chips else None,
        }
