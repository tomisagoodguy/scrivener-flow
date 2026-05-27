"""
News Media Step

從鉅亨網（CNYES）、經濟日報（UDN）、MoneyDJ 三個媒體來源
抓取 ETF 前十大持股近期新聞，寫入 etf_news 表，並追加至 ctx.news_context。

此為輔助步驟：execute() 內部 try/except 不 raise，失敗靜默跳過，不中斷主流程。
"""

import logging
from typing import TYPE_CHECKING

from sqlalchemy import text

from ETF.config.etf_registry import ALL_ETF_CODES
from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

TOP_N = 10  # 每支 ETF 取前幾大持股

logger = logging.getLogger(__name__)


class NewsMediaStep(BaseStep):
    """抓取媒體新聞（CNYES / UDN / MoneyDJ），存入 etf_news；追加 00981A 媒體新聞至 ctx.news_context"""

    @property
    def name(self) -> str:
        return "News Media"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run or ctx.df is None or ctx.df.empty

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            from ETF.services.news.cnyes_client import fetch_cnyes_news
            from ETF.services.news.udn_client import fetch_udn_news
            from ETF.services.news.moneydj_client import fetch_moneydj_news

            # 1. 取各 ETF 前十大持股代碼
            etf_top_codes = self._fetch_all_etf_top_codes(ctx, services)

            # 2. 00981A 以 ctx.df（最新未落 DB）覆蓋
            if ctx.df is not None and not ctx.df.empty:
                top_df = ctx.df.sort_values("weight", ascending=False).head(TOP_N)
                etf_top_codes[ctx.etf_code] = top_df["code"].tolist()

            # 3. 收集所有唯一股票代碼
            all_codes = list({c for codes in etf_top_codes.values() for c in codes})
            if not all_codes:
                self.logger.info("NewsMediaStep: 無持股代碼，跳過")
                return ctx

            # 4. 依序呼叫三個爬蟲，各自 try/except 不影響彼此
            media_news: list[dict] = []

            try:
                cnyes_news = fetch_cnyes_news(all_codes)
                media_news.extend(cnyes_news)
                self.logger.info(f"📰 CNYES: {len(cnyes_news)} 則")
            except Exception as e:
                self.logger.error(f"CNYES scraper failed: {e}")

            try:
                udn_news = fetch_udn_news(all_codes)
                media_news.extend(udn_news)
                self.logger.info(f"📰 UDN: {len(udn_news)} 則")
            except Exception as e:
                self.logger.error(f"UDN scraper failed: {e}")

            try:
                moneydj_news = fetch_moneydj_news(all_codes)
                media_news.extend(moneydj_news)
                self.logger.info(f"📰 MoneyDJ: {len(moneydj_news)} 則")
            except Exception as e:
                self.logger.error(f"MoneyDJ scraper failed: {e}")

            self.logger.info(f"📰 媒體新聞合計：{len(media_news)} 則（{len(all_codes)} 支股票）")

            if not media_news:
                return ctx

            # 5. 按 ETF 分別 upsert
            total_inserted = 0
            for etf_code, codes in etf_top_codes.items():
                codes_set = set(codes)
                etf_news = [n for n in media_news if n["stock_code"] in codes_set]
                if etf_news:
                    inserted = services.sql_storage.upsert_etf_news(etf_code, etf_news)
                    total_inserted += inserted

            self.logger.info(f"📰 etf_news 媒體新聞寫入：{total_inserted} 筆新記錄")

            # 6. 追加 00981A 媒體新聞至 ctx.news_context（過濾重複 title）
            main_codes = set(etf_top_codes.get(ctx.etf_code, []))
            main_media = [n for n in media_news if n["stock_code"] in main_codes]
            if main_media:
                existing_titles = {n.get("title", "") for n in ctx.news_context}
                new_items = [n for n in main_media if n.get("title") not in existing_titles]
                ctx.news_context.extend(new_items)
                self.logger.info(f"📰 ctx.news_context 追加媒體新聞：{len(new_items)} 則")

        except Exception as e:
            self.logger.error(f"NewsMediaStep failed: {e}")

        return ctx

    def _fetch_all_etf_top_codes(
        self,
        ctx: PipelineContext,
        services: "PipelineServices",
    ) -> dict[str, list[str]]:
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
