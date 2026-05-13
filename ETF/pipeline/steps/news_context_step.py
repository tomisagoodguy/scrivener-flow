"""
News Context Step

直接呼叫 MOPS 公開資訊觀測站 API，取得所有 ETF 前十大持股的近期重大公告。
- ctx.news_context：00981A 的公告列表，供 AI 報告使用
- etf_news DB 表：所有 11 支 ETF 的公告，供前端使用
"""

from sqlalchemy import text

from ETF.config.etf_registry import ALL_ETF_CODES
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.pipeline.steps.base import BaseStep

TOP_N = 10    # 取前幾大持股查公告
NEWS_DAYS = 5  # 回溯天數（含假日緩衝）


class NewsContextStep(BaseStep):
    """抓取所有 ETF 前十大持股近期 MOPS 重大公告，存入 DB；00981A 另注入 ctx.news_context"""

    @property
    def name(self) -> str:
        return "News Context"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run or ctx.df is None or ctx.df.empty

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            from ETF.services.news.mops_client import fetch_mops_announcements

            # 1. 從 DB 查所有 ETF 最新快照的前十大持股
            etf_top_codes = self._fetch_all_etf_top_codes(ctx, services)

            # 2. 00981A 用 ctx.df（最新、尚未落 DB）覆蓋
            if ctx.df is not None and not ctx.df.empty:
                top_df = ctx.df.sort_values("weight", ascending=False).head(TOP_N)
                etf_top_codes[ctx.etf_code] = top_df["code"].tolist()

            # 3. 收集所有唯一股票代碼，一次呼叫 MOPS
            all_codes = list({c for codes in etf_top_codes.values() for c in codes})
            if not all_codes:
                return ctx

            news = fetch_mops_announcements(all_codes, days=NEWS_DAYS)
            self.logger.info(
                f"📰 MOPS 重大公告：{len(news)} 則（{len(all_codes)} 支股票，近 {NEWS_DAYS} 日）"
            )

            # 4. ctx.news_context 保留 00981A 相關公告（供 AI 報告）
            main_codes = set(etf_top_codes.get(ctx.etf_code, []))
            ctx.news_context = [n for n in news if n["stock_code"] in main_codes]

            # 5. 按 ETF 分別 upsert：只 upsert 該 ETF 持有的股票公告
            total_inserted = 0
            for etf_code, codes in etf_top_codes.items():
                codes_set = set(codes)
                etf_news = [n for n in news if n["stock_code"] in codes_set]
                if etf_news:
                    inserted = services.sql_storage.upsert_etf_news(etf_code, etf_news)
                    total_inserted += inserted

            self.logger.info(f"📰 etf_news 寫入：{total_inserted} 筆新公告（{len(etf_top_codes)} 支 ETF）")

        except Exception as e:
            self.logger.error(f"NewsContextStep failed: {e}")
            ctx.news_context = []

        return ctx

    def _fetch_all_etf_top_codes(self, ctx: PipelineContext, services: "PipelineServices") -> dict[str, list[str]]:
        """從 etf_holdings_snapshot 查各 ETF 最新快照前十大持股代碼"""
        result: dict[str, list[str]] = {}
        try:
            with services.sql_storage.engine.connect() as conn:
                for etf_code in ALL_ETF_CODES:
                    rows = conn.execute(
                        text("""
                            SELECT stock_code
                            FROM etf_holdings_snapshot
                            WHERE etf_code = :etf_code
                              AND data_date = (
                                  SELECT MAX(data_date) FROM etf_holdings_snapshot
                                  WHERE etf_code = :etf_code
                              )
                            ORDER BY weight DESC NULLS LAST
                            LIMIT :top_n
                        """),
                        {"etf_code": etf_code, "top_n": TOP_N},
                    ).fetchall()
                    if rows:
                        result[etf_code] = [r[0] for r in rows]
        except Exception as e:
            self.logger.warning(f"_fetch_all_etf_top_codes failed: {e}")
        return result
