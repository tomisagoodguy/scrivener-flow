"""重現「大盤大跌日依融資使用率分組」統計（驗證文章數字）。"""

import sys

import numpy as np
import pandas as pd
from finlab import data

sys.stdout.reconfigure(encoding="utf-8")

START, END = "2009-01-01", "2026-10-16"
FEE, TAX, SLIP = 0.001425, 0.003, 0.001  # 滑價每邊 0.1% 為假設值


def g(name: str) -> pd.DataFrame:
    return pd.DataFrame(data.get(name))


close = g("price:收盤價")
idx = close.index
cols = [c for c in close.columns if len(c) == 4 and c.isdigit() and c[0] != "0"]
close = close[cols]
opn = g("price:開盤價").reindex(index=idx, columns=cols)
high = g("price:最高價").reindex(index=idx, columns=cols)
low = g("price:最低價").reindex(index=idx, columns=cols)
vol = g("price:成交股數").reindex(index=idx, columns=cols)
amt = g("price:成交金額").reindex(index=idx, columns=cols)
adj_o = g("etl:adj_open").reindex(index=idx, columns=cols)
adj_l = g("etl:adj_low").reindex(index=idx, columns=cols)
adj_c = g("etl:adj_close").reindex(index=idx, columns=cols)
mr = g("margin_transactions:融資使用率").reindex(index=idx, columns=cols)
mv = g("etl:market_value").reindex(index=idx, columns=cols)
taiex = g("market_transaction_info:收盤指數")["TAIEX"].reindex(idx)
etf50 = g("etl:adj_open").reindex(index=idx)["0050"]

ret = close / close.shift(1) - 1
mr_prev = mr.shift(1)
elig = (
    (amt.rolling(20).mean().shift(1) >= 5e7)
    & (close.shift(1) >= 10)
    & mr_prev.notna()
    & ret.notna()
    & (vol > 0)
)

mret = taiex.pct_change()
events = mret[(mret < -0.03) & (mret.index >= START) & (mret.index <= END)].index
print(f"事件日數：{len(events)}（文章 58）")


def quintile(s: pd.Series) -> pd.Series:
    return pd.qcut(s.rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)


rows, fwd_rows = [], []
for d in events:
    e = elig.loc[d]
    codes = e[e].index
    q = quintile(mr_prev.loc[d, codes])
    r = ret.loc[d, codes]
    pos = idx.get_loc(d)
    row = {"date": d, "n": len(codes), "mkt": mret.loc[d]}
    for k in range(1, 6):
        m = q == k
        row[f"q{k}"] = r[m].mean()
        row[f"ld{k}"] = (r[m] <= (-0.095 if d >= pd.Timestamp("2015-06-01") else -0.065)).mean()
    row["q5_thr"] = mr_prev.loc[d, codes][q == 5].min()
    rows.append(row)

    if pos + 21 < len(idx) and idx[pos + 21] <= pd.Timestamp("2026-10-30"):
        d1 = idx[pos + 1]
        locked = (high.loc[d1, codes] == low.loc[d1, codes]) & (
            opn.loc[d1, codes] <= close.loc[d, codes] * 0.91
        )
        ent = adj_o.loc[d1, codes]
        ex = adj_o.iloc[pos + 21][codes]
        net = ex / ent * (1 - FEE - TAX - SLIP) / (1 + FEE + SLIP) - 1
        path = adj_l.iloc[pos + 1 : pos + 21][codes]
        dd = (path.min() / ent - 1).clip(upper=0)
        fr = {"date": d}
        for k in (1, 5):
            m = (q == k) & ~locked & ent.notna() & ex.notna()
            fr[f"r{k}"] = net[m].mean()
            fr[f"dd{k}"] = dd[m].mean()
            fr[f"dd10_{k}"] = (dd[m] < -0.10).mean()
            fr[f"loss{k}"] = (net[m] < 0).mean()
        fr["0050"] = etf50.iloc[pos + 21] / etf50.iloc[pos + 1] - 1
        fwd_rows.append(fr)

ev = pd.DataFrame(rows).set_index("date")
fw = pd.DataFrame(fwd_rows).set_index("date")

print("\n== 大跌當天（每日五組平均再跨日平均）==")
print("五組:", " ".join(f"{ev[f'q{k}'].mean():+.2%}" for k in range(1, 6)))
print(f"Q1 {ev.q1.mean():+.2%}（文 -3.50%）  Q5 {ev.q5.mean():+.2%}（文 -5.83%）")
diff = ev.q5 - ev.q1
print(f"同日差 {diff.mean():+.2%}（文 -2.33）；Q5 較差天數 {(diff < 0).sum()}/{len(ev)}（文 54/58）")
print(f"跌停比例 Q1 {ev.ld1.mean():.1%}（文 9.3%）  Q5 {ev.ld5.mean():.1%}（文 32.8%）")

print("\n== 隔日開盤買、抱 20 日（含費稅滑價）==")
print(f"天數 {len(fw)}（文 57）")
print(f"Q1 {fw.r1.mean():+.2%}（文 +3.78%）  Q5 {fw.r5.mean():+.2%}（文 +7.69%）")
d2 = fw.r5 - fw.r1
print(f"差 {d2.mean():+.2%}（文 +3.91）；Q5 贏天數 {(d2 > 0).sum()}/{len(fw)}（文 43/57）")
pre = d2[d2.index < "2017-01-01"]
post = d2[d2.index >= "2017-01-01"]
print(f"  2009-2016 差 {pre.mean():+.2%}（n={len(pre)}，文 +1.61）  2017- 差 {post.mean():+.2%}（n={len(post)}）")
print(f"途中最深 Q1 {fw.dd1.mean():.1%}（文 -6.7%）  Q5 {fw.dd5.mean():.1%}（文 -11.2%）")
print(f"跌破-10% Q1 {fw.dd10_1.mean():.1%}（文 22.0%）  Q5 {fw.dd10_5.mean():.1%}（文 47.6%）")
print(f"虧損比例 Q1 {fw.loss1.mean():.1%}  Q5 {fw.loss5.mean():.1%}（文皆 36.4%）")
print(f"0050 同期 {fw['0050'].mean():+.2%}（文 +3.88%）")

d = pd.Timestamp("2026-10-15")
print("\n== 2026-10-15 ==")
print(f"大盤 {mret.loc[d]:+.2%}（文 -3.4%）")
e = elig.loc[d]
codes = e[e].index
q = quintile(mr_prev.loc[d, codes])
r = ret.loc[d, codes]
print(f"合格 {len(codes)} 檔（文 643）")
print("五組:", " ".join(f"{r[q == k].mean():+.2%}" for k in range(1, 6)),
      "（文 -1.47 -3.05 -4.16 -4.81 -5.40）")
cap = mv.loc[d, codes].rank(method="first")
tier = pd.qcut(cap, 3, labels=["小", "中", "大"])
print("市值三層:", " ".join(f"{t} {r[tier == t].mean():+.2%}" for t in ["小", "中", "大"]),
      "（文 -3.94 -3.60 -3.79）")
big = tier == "大"
qb = quintile(mr_prev.loc[d, codes][big])
rb = r[big]
print(f"大型層 Q1 {rb[qb == 1].mean():+.2%}（文 -1.41）  Q5 {rb[qb == 5].mean():+.2%}（文 -6.98）")
d16 = pd.Timestamp("2026-10-16")
e16 = elig.shift(-1).loc[d16].fillna(False).astype(bool) if d16 in idx else None
m16 = mr.loc[d16, codes].dropna()
print(f"10/16 使用率前 20% 門檻 {m16.quantile(0.8):.1f}%（文 22%），中位數 {m16.median():.1f}%（文 11%）")

ev.to_csv("events.csv", encoding="utf-8-sig")
fw.to_csv("forward.csv", encoding="utf-8-sig")
