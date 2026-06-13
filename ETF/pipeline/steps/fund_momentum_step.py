"""FundMomentumStep — 輔助步驟，計算全市場投信買超多維度指標並寫入 strategy_signals。

失敗時只 log，不中斷 pipeline（不 re-raise）。

指標說明：
  fund_1d       — 當日買超股數
  fund_5d       — 5日滾動累積買超
  fund_20d      — 20日滾動累積買超
  consec_days   — 從今日往回連續正值天數
  fund_ratio_5d — fund_5d / volume_5d（買超佔成交比率）
  score         — fund_20d.rank(pct=True) * 100，整數 0–100（全市場強度百分位）
  is_selected   — consec_days >= 3 AND score >= 90（建倉確認）
"""

import json
import logging
from datetime import date, timedelta
from typing import TYPE_CHECKING

import pandas as pd
from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)

STRATEGY_ID = "fund_momentum"
CONSEC_THRESHOLD = 3
SCORE_THRESHOLD = 90
LINE_NOTIFY_TYPE = "fund_momentum"


def _compute_consec_days(series: pd.Series) -> int:
    """從序列最後一個元素往回計算連續正值天數。"""
    count = 0
    for val in reversed(series.values):
        if pd.isna(val) or val <= 0:
            break
        count += 1
    return count


class FundMomentumStep(BaseStep):
    """每日計算投信買超多維度指標並寫入 strategy_signals（輔助步驟）。"""

    @property
    def name(self) -> str:
        return "Fund Momentum"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(ctx, services)
        except Exception as e:
            logger.error(f"[FundMomentumStep] 執行失敗，已跳過: {e}")
        return ctx

    def _run(self, ctx: PipelineContext, services: "PipelineServices") -> None:
        import finlab
        from finlab import data

        date_str = ctx.date_str or date.today().isoformat()

        logger.info(f"[FundMomentumStep] 開始計算投信買超指標，日期={date_str}")

        # 確保 FinLab 已登入（main.py pipeline 無統一登入點，需明確呼叫）
        client = getattr(services.finlab_srv, "client", None)
        if client and not client.login():
            logger.error("[FundMomentumStep] FinLab login 失敗，跳過")
            return

        # 取得 FinLab 資料
        fund_raw: pd.DataFrame = data.get("institutional_investors_trading_summary:投信買賣超股數")
        volume_raw: pd.DataFrame = data.get("price:成交股數")

        if fund_raw is None or fund_raw.empty:
            logger.warning("[FundMomentumStep] 投信買賣超資料為空，跳過")
            return
        if volume_raw is None or volume_raw.empty:
            logger.warning("[FundMomentumStep] 成交股數資料為空，跳過")
            return

        # 確保日期索引，截至 date_str
        fund_raw = fund_raw[fund_raw.index <= date_str]
        volume_raw = volume_raw[volume_raw.index <= date_str]

        if fund_raw.empty:
            logger.warning(f"[FundMomentumStep] {date_str} 前無投信資料，跳過")
            return

        # 對齊欄位（股票代號）
        common_stocks = fund_raw.columns.intersection(volume_raw.columns)
        fund_df = fund_raw[common_stocks]
        vol_df = volume_raw[common_stocks]

        # 計算滾動指標
        fund_5d: pd.DataFrame = fund_df.rolling(5, min_periods=1).sum()
        fund_20d: pd.DataFrame = fund_df.rolling(20, min_periods=1).sum()
        vol_5d: pd.DataFrame = vol_df.rolling(5, min_periods=1).sum()

        # 取最新一日資料
        latest_date = fund_df.index[-1]
        fund_1d_series: pd.Series = fund_df.iloc[-1]
        fund_5d_series: pd.Series = fund_5d.iloc[-1]
        fund_20d_series: pd.Series = fund_20d.iloc[-1]
        vol_5d_series: pd.Series = vol_5d.iloc[-1]

        # 全市場百分位排名 → score 整數 0-100
        # 無投信資料的個股 fund_20d=NaN → rank=NaN，需 fillna(0) 才能 astype(int)
        # （否則 IntCastingNaNError 會讓整個步驟靜默失敗，停止寫入）
        score_series: pd.Series = (fund_20d_series.rank(pct=True) * 100).round().fillna(0).astype(int)

        # 買超比率（避免除以零）
        fund_ratio_5d = fund_5d_series / vol_5d_series.replace(0, float("nan"))

        # 計算各股連續天數（從最後一日往回）
        consec_map: dict[str, int] = {}
        for stock_id in common_stocks:
            s = fund_df[stock_id].dropna()
            consec_map[stock_id] = _compute_consec_days(s)

        # 組裝 upsert rows
        date_key = str(latest_date)[:10] if hasattr(latest_date, "strftime") else str(latest_date)[:10]
        rows: list[dict] = []
        for stock_id in common_stocks:
            f1 = float(fund_1d_series[stock_id]) if pd.notna(fund_1d_series[stock_id]) else None
            f5 = float(fund_5d_series[stock_id]) if pd.notna(fund_5d_series[stock_id]) else None
            f20 = float(fund_20d_series[stock_id]) if pd.notna(fund_20d_series[stock_id]) else None
            sc = int(score_series[stock_id]) if pd.notna(score_series[stock_id]) else 0
            cd = consec_map.get(str(stock_id), 0)
            ratio = float(fund_ratio_5d[stock_id]) if pd.notna(fund_ratio_5d[stock_id]) else None

            is_sel = cd >= CONSEC_THRESHOLD and sc >= SCORE_THRESHOLD

            metadata = {
                "fund_1d": f1,
                "fund_5d": f5,
                "fund_20d": f20,
                "consec_days": cd,
                "fund_ratio_5d": ratio,
            }

            rows.append({
                "strategy_id": STRATEGY_ID,
                "date": date_key,
                "stock_id": str(stock_id),
                "score": sc,
                "is_selected": is_sel,
                "conditions": json.dumps(metadata),
            })

        if not rows:
            logger.info("[FundMomentumStep] 無任何股票資料，跳過寫入")
            return

        # 寫入 strategy_signals（conditions 欄位存放 metadata）
        services.sql_storage.upsert_strategy_signals(rows)
        selected_count = sum(1 for r in rows if r["is_selected"])
        logger.info(f"[FundMomentumStep] 寫入 {len(rows)} 筆，is_selected={selected_count}")

        # 建倉確認 LINE 通知
        self._notify_new_selected(ctx, services, rows, date_key)

    def _notify_new_selected(
        self,
        ctx: PipelineContext,
        services: "PipelineServices",
        rows: list[dict],
        date_key: str,
    ) -> None:
        """推播當日新進入建倉確認的個股（昨日未 is_selected，今日首次 is_selected）。"""
        selected_today = [r for r in rows if r["is_selected"]]
        if not selected_today:
            return

        try:
            from sqlalchemy import text as sa_text
            yesterday = (
                pd.Timestamp(date_key) - pd.tseries.offsets.BDay(1)
            ).strftime("%Y-%m-%d")

            # 查前一交易日 is_selected 清單
            prev_selected: set[str] = set()
            with services.sql_storage.engine.connect() as conn:
                result = conn.execute(
                    sa_text("""
                        SELECT stock_id FROM strategy_signals
                        WHERE strategy_id = :sid
                          AND date = :d
                          AND is_selected = true
                    """),
                    {"sid": STRATEGY_ID, "d": yesterday},
                )
                prev_selected = {row[0] for row in result}

            # 找出「新增」的個股
            newly_selected = [
                r for r in selected_today if r["stock_id"] not in prev_selected
            ]
            if not newly_selected:
                return

            # 防重複推播：upsert etf_notification_log
            new_to_notify: list[dict] = []
            with services.sql_storage.engine.connect() as conn:
                for r in newly_selected:
                    row_result = conn.execute(
                        sa_text("""
                            INSERT INTO etf_notification_log (date, type, stock_id)
                            VALUES (:d, :t, :s)
                            ON CONFLICT (date, type, stock_id) DO NOTHING
                            RETURNING stock_id
                        """),
                        {"d": date_key, "t": LINE_NOTIFY_TYPE, "s": r["stock_id"]},
                    ).fetchone()
                    if row_result:
                        new_to_notify.append(r)
                conn.commit()

            if not new_to_notify:
                return

            # 組裝 LINE 訊息
            lines = [f"📈 投信建倉確認（{date_key}）\n"]
            for r in new_to_notify:
                meta = json.loads(r["conditions"]) if r["conditions"] else {}
                consec = meta.get("consec_days", 0)
                score = r["score"]
                lines.append(f"• {r['stock_id']}  連續{consec}天買超，全市場 Top {100 - score + 1}%")

            msg = "\n".join(lines)
            services.notifier.send_text(msg)
            logger.info(f"[FundMomentumStep] LINE 通知已發送：{len(new_to_notify)} 支新建倉股")

        except Exception as e:
            logger.error(f"[FundMomentumStep] LINE 通知失敗（不影響主流程）: {e}")
