"""
Notify Step

合併 11 支 ETF 的異動摘要，發送一則 LINE Carousel 通知。
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from ETF.daily_ai_report import build_sector_summary
from typing import TYPE_CHECKING, List, Dict, Any
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
import pandas as pd


class NotifyStep(BaseStep):
    """發送合併 LINE 通知（一則 Carousel 涵蓋所有 ETF）"""

    @property
    def name(self) -> str:
        return "Send Notifications"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        from ETF.config.etf_registry import ETF_META

        notifier = services.notifier

        # 1. 整合 00981A 摘要（主流程）
        entry = ETF_META.get(ctx.etf_code)
        main_summary = {
            "etf_code": ctx.etf_code,
            "etf_name": entry.name if entry else ctx.etf_code,
            "data_date": ctx.date_str,
            "total_holdings": len(ctx.df) if ctx.df is not None else 0,
            "diff_logs": ctx.diff_logs or [],
            "diff_stats": self._compute_diff_stats(ctx.diff_logs or []),
        }

        # 2. 合併次要 ETF 摘要（MultiEtfStep 已累積）
        all_summaries = [main_summary] + (ctx.all_etf_summaries or [])

        # 3. 市場訊號：只取 00981A 的資料
        market_signals = self._extract_market_signals(ctx.df) if ctx.df is not None else {}

        # 4. 發送合併 Carousel（一則），帶入大戶籌碼訊號
        notifier.notify_merged_carousel(
            all_summaries, market_signals,
            shareholder_signals=ctx.shareholder_signals or {},
        )
        self.logger.info(
            f"Merged carousel sent: {len(all_summaries)} ETFs, "
            f"{sum(len(s['diff_logs']) for s in all_summaries)} total diff events."
        )

        # 盤前指引 bubble（全市場共識，輔助，失敗不中斷）
        try:
            from ETF.notifiers.pre_market_notify import (
                fetch_latest_flow_row, build_pre_market_bubble,
                fetch_981a_diff_row, build_981a_guide_bubble,
            )
            row = fetch_latest_flow_row(services.sql_storage.engine)
            row_981a = fetch_981a_diff_row(services.sql_storage.engine)

            bubbles = []
            if row is not None:
                bubbles.append(build_pre_market_bubble(row))
            if row_981a is not None:
                bubbles.append(build_981a_guide_bubble(row_981a))

            if len(bubbles) == 1:
                date_label = (row or row_981a or {}).get("data_date", ctx.date_str)
                notifier.broadcast_flex_message(f"盤前指引 · {date_label}", bubbles[0])
            elif len(bubbles) == 2:
                date_label = (row or {}).get("data_date", ctx.date_str)
                notifier.broadcast_flex_message(
                    f"盤前指引 · {date_label}",
                    {"type": "carousel", "contents": bubbles},
                )
                self.logger.info("Pre-market carousel (market + 00981A) sent for %s", date_label)
        except Exception as e:
            self.logger.error("Pre-market LINE notify failed: %s", e)

        # 族群強弱摘要（輔助，失敗不中斷）
        try:
            summary = build_sector_summary(services.sql_storage.engine, ctx.date_str)
            if summary:
                notifier.send_text(summary)
                self.logger.info("Sector strength summary sent to LINE.")
        except Exception as e:
            self.logger.error("Sector summary LINE notify failed: %s", e)

        return ctx

    # ------------------------------------------------------------------ helpers

    def _compute_diff_stats(self, diff_logs: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "total_changes": len(diff_logs),
            "new_in": len([d for d in diff_logs if d["change_type"] == "IN"]),
            "removed": len([d for d in diff_logs if d["change_type"] == "OUT"]),
            "adjusted": len([d for d in diff_logs if d["change_type"] in ["BUY", "SELL"]]),
        }

    def _extract_market_signals(self, df: "pd.DataFrame | None") -> Dict[str, List[Dict[str, Any]]]:
        """
        從 00981A 持股資料中提取市場訊號：
        1. 營收爆發 (YoY Top 10, MoM Top 10, 雙成長)
        2. 強勢突破 (200日/20日/5日新高)
        3. 成交金額 Top 10
        """
        if df is None or df.empty:
            return {}

        signals: Dict[str, List[Dict[str, Any]]] = {
            "revenue_yoy_top10": [],
            "revenue_mom_top10": [],
            "revenue_double_growth": [],
            "breakout_200": [],
            "breakout_20": [],
            "breakout_5": [],
            "amount_top10": [],
        }

        try:
            def _format_list(sub_df, value_col, fmt="{:+.1f}%"):
                return [
                    {
                        "name": row.get("name", "N/A"),
                        "code": row.get("code", "N/A"),
                        "value": fmt.format(row[value_col]) if pd.notnull(row[value_col]) else "N/A",
                    }
                    for _, row in sub_df.iterrows()
                ]

            if "revenue_yoy" in df.columns:
                yoy_df = df[df["revenue_yoy"].notnull()].sort_values("revenue_yoy", ascending=False).head(10)
                signals["revenue_yoy_top10"] = _format_list(yoy_df, "revenue_yoy")

            if "revenue_mom" in df.columns:
                mom_df = df[df["revenue_mom"].notnull()].sort_values("revenue_mom", ascending=False).head(10)
                signals["revenue_mom_top10"] = _format_list(mom_df, "revenue_mom")

            if "revenue_yoy" in df.columns and "revenue_mom" in df.columns:
                mask = (df["revenue_yoy"] > 0) & (df["revenue_mom"] > 0)
                double_df = df[mask].copy()
                if not double_df.empty:
                    double_df["combined_growth"] = double_df["revenue_yoy"] + double_df["revenue_mom"]
                    top10 = double_df.sort_values("combined_growth", ascending=False).head(10)
                    signals["revenue_double_growth"] = [
                        {
                            "name": row.get("name", "N/A"),
                            "code": row.get("code", "N/A"),
                            "value": f"Y:{row['revenue_yoy']:.1f}%/M:{row['revenue_mom']:.1f}%",
                        }
                        for _, row in top10.iterrows()
                    ]

            reported_codes: set[str] = set()
            for window in [200, 20, 5]:
                col = f"is_high_{window}d"
                key = f"breakout_{window}"
                if col in df.columns:
                    breakout_stocks = df[df[col] == True]
                    entries = []
                    for _, row in breakout_stocks.iterrows():
                        code = row.get("code", "N/A")
                        if code not in reported_codes:
                            reported_codes.add(code)
                            entries.append({
                                "name": row.get("name", "N/A"),
                                "code": code,
                                "value": f"{window}日新高",
                            })
                    signals[key] = entries

            if "amount" in df.columns:
                amount_df = df[df["amount"].notnull()].sort_values("amount", ascending=False).head(10)

                def fmt_amount(val):
                    if pd.isna(val):
                        return "N/A"
                    if val >= 100000000:
                        return f"{val/100000000:.2f}億"
                    elif val >= 10000:
                        return f"{val/10000:.0f}萬"
                    return str(val)

                signals["amount_top10"] = [
                    {
                        "name": row.get("name", "N/A"),
                        "code": row.get("code", "N/A"),
                        "value": fmt_amount(row["amount"]),
                    }
                    for _, row in amount_df.iterrows()
                ]

        except Exception as e:
            self.logger.error(f"Error extracting market signals: {e}")

        return signals
