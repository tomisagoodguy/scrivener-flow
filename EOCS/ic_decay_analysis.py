# -*- coding: utf-8 -*-
"""各策略核心因子 IC Decay 分析

分析 super8888 / capital_layer / low_vol_cap / broker_ranked 的共用因子，
以及族群強弱篩選條件（ret_1d、ret_5d、breadth、volume ratio）
在 1/5/10/20/60 日前瞻報酬的預測力衰減曲線。

執行方式：
    uv run --with "finlab>=2.0.0" python EOCS/ic_decay_analysis.py

可視化輸出：
    - ic_decay_curve.png     各因子 IC vs 持有天數
    - ic_rolling_60d.png     各因子 rolling 60 日 IC 走勢（近 2 年）
    - factor_correlation.png 因子間相關矩陣
"""

import os
import warnings
from scipy import stats
import numpy as np
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

warnings.filterwarnings("ignore")
matplotlib.rcParams["axes.unicode_minus"] = False

# 嘗試設定中文字型（可選）
for font in ["Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC"]:
    if any(font in f.name for f in fm.fontManager.ttflist):
        matplotlib.rcParams["font.family"] = font
        break

# ── FinLab 登入 ──────────────────────────────────────────────────────────────
import finlab
from dotenv import load_dotenv
load_dotenv(".env.local")
load_dotenv()

api_token = os.environ.get("FINLAB_API_KEY") or os.environ.get("FINLAB_API_TOKEN")
if api_token:
    finlab.login(api_token=api_token)
else:
    finlab.login()  # fallback: 瀏覽器登入

from finlab import data


# ══════════════════════════════════════════════════════════════════════════════
# 1. 資料載入
# ══════════════════════════════════════════════════════════════════════════════

print("載入資料中...")

close = data.get("price:收盤價")
amt   = data.get("price:成交金額")
rev   = data.get("monthly_revenue:當月營收")
cap   = data.get("etl:market_value")

# 主力籌碼（capital_layer / broker_ranked 共用）
buy_vol  = data.get("etl:broker_transactions:top15_buy").fillna(0)
sell_vol = data.get("etl:broker_transactions:top15_sell").fillna(0)

print("資料載入完成")


# ══════════════════════════════════════════════════════════════════════════════
# 2. 定義各策略核心連續因子
# ══════════════════════════════════════════════════════════════════════════════

def build_factors(close, amt, rev, cap, buy_vol, sell_vol):
    """
    回傳 dict[factor_name -> FinlabDataFrame（每日×股票，連續值）]

    分群說明：
      [趨勢/動能]  momentum_20d, rsv_180, rs_100, ma_trend_score
      [營收]       rev_momentum_3_12, rev_accel
      [籌碼]       broker_force, vol_breakout
      [估值/風險]  smallcap_pct, price_to_high_240
    """
    factors = {}

    # ── 趨勢 / 動能 ────────────────────────────────────────────────────────
    # 20 日動能（EOCS 參考）
    factors["momentum_20d"] = close / close.shift(20)

    # RSV(180)：近 180 日 K 值 — capital_layer / low_vol_cap / broker_ranked 共用
    lo180 = close.rolling(180, min_periods=90).min()
    hi180 = close.rolling(180, min_periods=90).max()
    factors["rsv_180"] = (close - lo180) / (hi180 - lo180)

    # RS(100)：100 日相對強弱
    factors["rs_100"] = close / close.shift(100)

    # 均線多頭評分（MA5 > MA20 且上升得 2，MA5 > MA20 得 1，其餘 0）
    ma5  = close.rolling(5).mean()
    ma20 = close.rolling(20).mean()
    ma_rising = ma20.pct_change(5)
    factors["ma_trend_score"] = (
        (ma5 > ma20).astype(float) + ma_rising.clip(lower=0)
    )

    # ── 營收 ───────────────────────────────────────────────────────────────
    # 3M/12M 營收加速（capital_layer / low_vol_cap / broker_ranked 共用）
    rev_3m  = rev.rolling(3, min_periods=2).mean()
    rev_12m = rev.rolling(12, min_periods=6).mean()
    factors["rev_momentum_3_12"] = rev_3m / rev_12m

    # 月營收同比成長率（super8888 用 rev_year_growth，capital_layer 用 YoY）
    factors["rev_yoy"] = rev / rev.shift(12) - 1

    # 6 個月營收是否創近期新高（super8888 c3）
    rev_6m = rev.rolling(6, min_periods=3).mean()
    factors["rev_6m_peak"] = rev_6m / rev_6m.rolling(20, min_periods=10).max()

    # ── 籌碼 ───────────────────────────────────────────────────────────────
    # 主力淨買量強度（capital_layer / broker_ranked 共用）
    net_vol = (buy_vol - sell_vol) * close
    force_mean = net_vol.rolling(60, min_periods=30).mean()
    force_std  = net_vol.rolling(60, min_periods=30).std()
    factors["broker_force"] = force_mean / (force_std + 1e-8)

    # 成交量突破（super8888 c1）
    factors["vol_breakout"] = amt / amt.rolling(60, min_periods=30).mean()

    # ── 估值 / 規模 ────────────────────────────────────────────────────────
    # 小市值（EOCS 示範）：值越小 = 市值越小
    factors["smallcap_pct"] = 1 - cap.rank(axis=1, pct=True)

    # 近高點位置（low_vol_cap / broker_ranked）
    factors["price_to_high_240"] = close / close.rolling(240, min_periods=120).max()

    return factors


factors = build_factors(close, amt, rev, cap, buy_vol, sell_vol)
print(f"因子數量：{len(factors)}")
for k in factors:
    print(f"  {k}")


# ══════════════════════════════════════════════════════════════════════════════
# 3. IC Decay 計算（Rank IC at multiple forward horizons）
# ══════════════════════════════════════════════════════════════════════════════

HORIZONS = [1, 5, 10, 20, 40, 60]


def compute_rank_ic(factor: pd.DataFrame, fwd_ret: pd.DataFrame) -> float:
    """橫截面 Rank IC：對齊後在每個日期算 spearmanr，取時序均值。"""
    f, r = factor.align(fwd_ret, join="inner")
    ics = []
    for dt in f.index:
        ff = f.loc[dt].dropna()
        rr = r.loc[dt].dropna()
        common = ff.index.intersection(rr.index)
        if len(common) < 30:
            continue
        ic, _ = stats.spearmanr(ff[common], rr[common])
        if not np.isnan(ic):
            ics.append(ic)
    return float(np.mean(ics)) if ics else np.nan


print("\n計算 IC Decay...")
ic_decay_records = []

for h in HORIZONS:
    fwd_ret = close.pct_change(h, fill_method=None).shift(-h)
    for fname, fdf in factors.items():
        ic = compute_rank_ic(fdf, fwd_ret)
        ic_decay_records.append({"factor": fname, "horizon": h, "rank_ic": ic})
        print(f"  {fname:25s}  h={h:2d}d  IC={ic:+.4f}")

ic_decay = (
    pd.DataFrame(ic_decay_records)
    .pivot(index="horizon", columns="factor", values="rank_ic")
)
print("\nIC Decay 矩陣：")
print(ic_decay.round(4).to_string())


# ══════════════════════════════════════════════════════════════════════════════
# 4. Rolling 60 日 IC（近 2 年）
# ══════════════════════════════════════════════════════════════════════════════

ROLLING_H = 20  # 分析 20 日前瞻報酬的 rolling IC
ROLLING_WIN = 60

print(f"\n計算 Rolling {ROLLING_WIN} 日 IC（h={ROLLING_H}d）...")
fwd_ret_20 = close.pct_change(ROLLING_H, fill_method=None).shift(-ROLLING_H)

# 只保留近 2 年日期節省運算
cutoff = close.index[-1] - pd.DateOffset(years=2)
dates = [d for d in close.index if d >= cutoff]

rolling_ic_records: dict[str, list[float]] = {k: [] for k in factors}

for i, dt in enumerate(dates):
    window_dates = [d for d in close.index if d < dt][-ROLLING_WIN:]
    if len(window_dates) < 30:
        for k in factors:
            rolling_ic_records[k].append(np.nan)
        continue
    for fname, fdf in factors.items():
        f_win = fdf.loc[fdf.index.isin(window_dates)]
        r_win = fwd_ret_20.loc[fwd_ret_20.index.isin(window_dates)]
        ic = compute_rank_ic(f_win, r_win)
        rolling_ic_records[fname].append(ic)

rolling_ic_df = pd.DataFrame(rolling_ic_records, index=dates)


# ══════════════════════════════════════════════════════════════════════════════
# 5. 族群強弱因子 IC（sector-level，用個股代理）
# ══════════════════════════════════════════════════════════════════════════════
# 族群強弱篩選條件：ret_1d > 0、ret_5d > 0、breadth > 0.4、vol ratio >= 0.8
# 個股層級代理因子：
#   sector_proxy_1d  = 1 日報酬（代理 ret_1d）
#   sector_proxy_5d  = 5 日報酬（代理 ret_5d）
#   breadth_proxy    = 20 日中股價 > MA20 的天數比（代理 breadth）
#   vol_ratio_proxy  = 成交金額 / 20MA（代理 volume ratio）

print("\n計算族群強弱代理因子 IC...")
sector_factors = {
    "sector_ret_1d":   close.pct_change(1, fill_method=None),
    "sector_ret_5d":   close.pct_change(5, fill_method=None),
    "vol_ratio_20d":   amt / amt.rolling(20, min_periods=10).mean(),
    "above_ma20_pct":  (close > close.rolling(20).mean()).rolling(10).mean(),
}

sector_ic_records = []
for h in HORIZONS:
    fwd_ret = close.pct_change(h, fill_method=None).shift(-h)
    for fname, fdf in sector_factors.items():
        ic = compute_rank_ic(fdf, fwd_ret)
        sector_ic_records.append({"factor": fname, "horizon": h, "rank_ic": ic})

sector_ic_decay = (
    pd.DataFrame(sector_ic_records)
    .pivot(index="horizon", columns="factor", values="rank_ic")
)
print("族群強弱代理因子 IC Decay：")
print(sector_ic_decay.round(4).to_string())


# ══════════════════════════════════════════════════════════════════════════════
# 6. 視覺化
# ══════════════════════════════════════════════════════════════════════════════

# 依策略分群，方便對照
FACTOR_GROUPS = {
    "趨勢/動能":   ["momentum_20d", "rsv_180", "rs_100", "ma_trend_score"],
    "營收":        ["rev_momentum_3_12", "rev_yoy", "rev_6m_peak"],
    "籌碼":        ["broker_force", "vol_breakout"],
    "估值/規模":   ["smallcap_pct", "price_to_high_240"],
}
GROUP_COLORS = {
    "趨勢/動能": ["#e74c3c", "#c0392b", "#e67e22", "#d35400"],
    "營收":      ["#27ae60", "#2ecc71", "#1abc9c"],
    "籌碼":      ["#2980b9", "#3498db"],
    "估值/規模": ["#8e44ad", "#9b59b6"],
}

fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle("各策略核心因子 IC Decay 分析（台股）", fontsize=14, fontweight="bold")

for ax, (group, fnames) in zip(axes.flatten(), FACTOR_GROUPS.items()):
    colors = GROUP_COLORS[group]
    for fname, color in zip(fnames, colors):
        if fname in ic_decay.columns:
            ax.plot(ic_decay.index, ic_decay[fname], marker="o", label=fname,
                    color=color, linewidth=2, markersize=5)
    ax.axhline(0, color="gray", linestyle="--", linewidth=0.8, alpha=0.7)
    ax.axhline(0.03, color="green", linestyle=":", linewidth=0.8, alpha=0.5,
               label="IC=0.03 參考線")
    ax.set_title(group, fontsize=11, fontweight="bold")
    ax.set_xlabel("持有天數")
    ax.set_ylabel("Rank IC")
    ax.set_xticks(HORIZONS)
    ax.legend(fontsize=7, loc="upper right")
    ax.grid(True, alpha=0.3)

plt.tight_layout()
out_path = "EOCS/ic_decay_curve.png"
plt.savefig(out_path, dpi=150, bbox_inches="tight")
print(f"\nIC Decay 曲線已儲存：{out_path}")
plt.show()


# ── Rolling IC 走勢（前 6 個最重要因子）─────────────────────────────────────
TOP_FACTORS = ["rev_momentum_3_12", "rsv_180", "broker_force",
               "momentum_20d", "vol_breakout", "ma_trend_score"]

fig2, ax2 = plt.subplots(figsize=(16, 6))
for fname in TOP_FACTORS:
    if fname in rolling_ic_df.columns:
        series = rolling_ic_df[fname].rolling(10).mean()  # 再平滑一次
        ax2.plot(series.index, series, label=fname, linewidth=1.5, alpha=0.85)

ax2.axhline(0, color="gray", linestyle="--", linewidth=0.8)
ax2.axhline(0.03, color="green", linestyle=":", linewidth=0.8, alpha=0.5)
ax2.axhline(-0.03, color="red", linestyle=":", linewidth=0.8, alpha=0.5)
ax2.set_title(f"Rolling {ROLLING_WIN} 日 Rank IC（h=20d，近 2 年）", fontsize=12, fontweight="bold")
ax2.set_xlabel("日期")
ax2.set_ylabel("Rank IC")
ax2.legend(fontsize=8)
ax2.grid(True, alpha=0.3)
plt.tight_layout()
out_path2 = "EOCS/ic_rolling_60d.png"
plt.savefig(out_path2, dpi=150, bbox_inches="tight")
print(f"Rolling IC 走勢已儲存：{out_path2}")
plt.show()


# ── 族群強弱因子 IC Decay────────────────────────────────────────────────────
fig3, ax3 = plt.subplots(figsize=(10, 5))
sector_colors = ["#e74c3c", "#e67e22", "#3498db", "#27ae60"]
for fname, color in zip(sector_ic_decay.columns, sector_colors):
    ax3.plot(sector_ic_decay.index, sector_ic_decay[fname], marker="o",
             label=fname, color=color, linewidth=2, markersize=5)
ax3.axhline(0, color="gray", linestyle="--", linewidth=0.8)
ax3.set_title("族群強弱代理因子 IC Decay（個股層級）", fontsize=12, fontweight="bold")
ax3.set_xlabel("持有天數")
ax3.set_ylabel("Rank IC")
ax3.set_xticks(HORIZONS)
ax3.legend(fontsize=9)
ax3.grid(True, alpha=0.3)
plt.tight_layout()
out_path3 = "EOCS/ic_sector_decay.png"
plt.savefig(out_path3, dpi=150, bbox_inches="tight")
print(f"族群強弱 IC Decay 已儲存：{out_path3}")
plt.show()


# ── 摘要報告 ─────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("IC Decay 摘要報告")
print("="*60)
print("\n[各因子最佳持有天數（IC 最高的 horizon）]")
for fname in ic_decay.columns:
    row = ic_decay[fname].dropna()
    if len(row) == 0:
        continue
    best_h = row.abs().idxmax()
    best_ic = row[best_h]
    # IC decay half-life（IC 降至最大值 50% 的天數）
    max_ic = row.abs().max()
    decay_pts = row.abs()[row.abs() < max_ic * 0.5]
    half_life = decay_pts.index[0] if len(decay_pts) > 0 else ">60"
    print(f"  {fname:25s}  最佳 h={best_h:2d}d  IC={best_ic:+.4f}  半衰期≈{half_life}d")

print("\n[族群強弱代理因子]")
for fname in sector_ic_decay.columns:
    row = sector_ic_decay[fname].dropna()
    if len(row) == 0:
        continue
    best_h = row.abs().idxmax()
    best_ic = row[best_h]
    print(f"  {fname:20s}  最佳 h={best_h:2d}d  IC={best_ic:+.4f}")

print("\n[策略對應建議]")
print("  ■ IC 在 1-5 日最高、20 日快速衰減 → 高頻換手、月頻換股易 turnover 過高")
print("  ■ IC 在 20 日前平穩 → 月頻換股（resample='ME'）適合")
print("  ■ IC 長期（60 日）仍顯著 → 季頻也可，但損失部分 alpha")
print("  ■ rolling IC 近期轉負 → 因子近期失效，考慮剔除或降權")
