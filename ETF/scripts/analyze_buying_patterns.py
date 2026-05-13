"""
分析各買進模式的前瞻報酬 vs baseline。
輸出：各 pattern 在各天期的平均報酬率、勝率、樣本數。

執行：
  uv run python ETF/scripts/analyze_buying_patterns.py
"""

import json
import os
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(".env.local")

import pandas as pd
from scipy import stats
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.WARNING)

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

HORIZONS = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30]

# 1. 取所有有 future_returns 的事件
with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT pattern_type, stock_code, etf_code, event_date, future_returns
        FROM etf_buying_patterns
        WHERE future_returns IS NOT NULL AND future_returns != '{}'
    """)).fetchall()

print(f"Total events with returns: {len(rows)}")

records = []
for r in rows:
    fr = r.future_returns
    if isinstance(fr, str):
        fr = json.loads(fr)
    base = {
        "pattern_type": r.pattern_type,
        "stock_code": r.stock_code,
        "etf_code": r.etf_code,
        "event_date": str(r.event_date),
    }
    for h in HORIZONS:
        key = str(h)
        if key in fr:
            base[f"r{h}d"] = fr[key]
    records.append(base)

df = pd.DataFrame(records)
print(f"DataFrame shape: {df.shape}")
print(f"Patterns: {sorted(df['pattern_type'].unique())}")
print()

# 2. 計算 baseline（所有事件不分 pattern）
def summarize(subset: pd.DataFrame, label: str):
    print(f"{'Pattern':<20} {'N':>5} {'r1d%':>7} {'r5d%':>7} {'r10d%':>7} {'r20d%':>7} {'r30d%':>7} {'win5d%':>7}")
    print("-" * 80)
    for name, grp in subset.groupby("pattern_type"):
        n = len(grp)
        r1 = grp["r1d"].mean() * 100 if "r1d" in grp else float("nan")
        r5 = grp["r5d"].mean() * 100 if "r5d" in grp else float("nan")
        r10 = grp["r10d"].mean() * 100 if "r10d" in grp else float("nan")
        r20 = grp["r20d"].mean() * 100 if "r20d" in grp else float("nan")
        r30 = grp["r30d"].mean() * 100 if "r30d" in grp else float("nan")
        win5 = (grp["r5d"] > 0).mean() * 100 if "r5d" in grp else float("nan")
        print(f"{name:<20} {n:>5} {r1:>7.2f} {r5:>7.2f} {r10:>7.2f} {r20:>7.2f} {r30:>7.2f} {win5:>7.1f}")

# Baseline row
def print_baseline(df: pd.DataFrame):
    n = len(df)
    r1 = df["r1d"].mean() * 100 if "r1d" in df else float("nan")
    r5 = df["r5d"].mean() * 100 if "r5d" in df else float("nan")
    r10 = df["r10d"].mean() * 100 if "r10d" in df else float("nan")
    r20 = df["r20d"].mean() * 100 if "r20d" in df else float("nan")
    r30 = df["r30d"].mean() * 100 if "r30d" in df else float("nan")
    win5 = (df["r5d"] > 0).mean() * 100 if "r5d" in df else float("nan")
    print(f"{'[ALL EVENTS]':<20} {n:>5} {r1:>7.2f} {r5:>7.2f} {r10:>7.2f} {r20:>7.2f} {r30:>7.2f} {win5:>7.1f}")
    print("-" * 80)

print("=" * 80)
print("各 Pattern 平均報酬率 (%) 及 5 日勝率 (%)")
print("=" * 80)
print_baseline(df)
summarize(df, "all")

# 3. t-test vs baseline（5 日報酬）
print()
print("=" * 80)
print("各 Pattern vs Baseline 的 5 日報酬 t-test（H1: pattern 平均 > baseline）")
print("=" * 80)
if "r5d" in df.columns:
    baseline_r5 = df["r5d"].dropna()
    print(f"{'Pattern':<20} {'N':>5} {'mean5d%':>8} {'t-stat':>8} {'p-value':>8} {'sig':>5}")
    print("-" * 60)
    for name, grp in df.groupby("pattern_type"):
        vals = grp["r5d"].dropna()
        if len(vals) < 5:
            continue
        t, p = stats.ttest_ind(vals, baseline_r5, equal_var=False, alternative="greater")
        sig = "***" if p < 0.01 else ("**" if p < 0.05 else ("*" if p < 0.1 else ""))
        print(f"{name:<20} {len(vals):>5} {vals.mean()*100:>8.2f} {t:>8.3f} {p:>8.4f} {sig:>5}")

# 4. 各 pattern 在不同市場環境下的表現（按 etf_code）
print()
print("=" * 80)
print("各 ETF 的 Pattern 分布")
print("=" * 80)
print(df.groupby(["etf_code", "pattern_type"]).size().unstack(fill_value=0).to_string())

# 5. 最近 30 天 vs 全期
print()
print("=" * 80)
print("近 30 天 vs 全期（5 日平均報酬）")
print("=" * 80)
df["event_date"] = pd.to_datetime(df["event_date"])
recent = df[df["event_date"] >= df["event_date"].max() - pd.Timedelta(days=30)]
print(f"近 30 天事件數：{len(recent)}, 全期：{len(df)}")
if "r5d" in df.columns and len(recent) > 0:
    print(f"{'Pattern':<20} {'全期 r5d%':>10} {'近30d r5d%':>12}")
    print("-" * 45)
    for name, grp in df.groupby("pattern_type"):
        all_r5 = grp["r5d"].mean() * 100
        rec = recent[recent["pattern_type"] == name]["r5d"]
        rec_r5 = rec.mean() * 100 if len(rec) > 0 else float("nan")
        print(f"{name:<20} {all_r5:>10.2f} {rec_r5:>12.2f}")
