"""
Scrape Step

負責從網站抓取 ETF 持股資料（00981A 主流程）。
若 FinLab price 欄位空缺率 > 30%，自動觸發官網 API 備援補充持股。
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext

_PRICE_FALLBACK_THRESHOLD = 0.30  # 空缺率門檻


class ScrapeStep(BaseStep):
    """抓取 ETF 持股資料"""

    @property
    def name(self) -> str:
        return "Scrape Holdings"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        from ETF.scrapers.fhtrust_scraper import FhTrustScraper

        scraper = FhTrustScraper(ctx.output_dir)
        df, date_str = scraper.run()

        if df is None or df.empty:
            raise ValueError("Scraping returned no data")

        ctx.df = df
        ctx.date_str = date_str
        ctx.update_finlab_stock_list()

        self.logger.info(f"Scraped data for {date_str}. Records: {len(df)}")

        self._maybe_apply_official_api_fallback(ctx)

        return ctx

    def _maybe_apply_official_api_fallback(self, ctx: PipelineContext) -> None:
        """price 欄位空缺率超過門檻時，用官網 API 補充持股欄位。"""
        df = ctx.df
        if "price" not in df.columns:
            return

        null_rate = df["price"].isna().mean()
        if null_rate <= _PRICE_FALLBACK_THRESHOLD:
            return

        self.logger.warning(
            f"[FALLBACK] price 空缺率 {null_rate:.1%} > {_PRICE_FALLBACK_THRESHOLD:.0%}，"
            f"觸發官網 API 備援"
        )
        try:
            from ETF.scrapers.official_api_scraper import fetch_holdings
            backup_df = fetch_holdings("00981A", ctx.date_str)
            if backup_df.empty:
                self.logger.warning("[FALLBACK] 官網 API 備援也回傳空資料，繼續原流程")
                return

            # 用備援資料補充 code/name/weight/shares（不覆蓋 price 等 FinLab 欄位）
            backup_map = backup_df.set_index("code")
            for col in ("name", "weight", "shares"):
                if col in backup_map.columns and col in df.columns:
                    missing_mask = df[col].isna()
                    df.loc[missing_mask, col] = df.loc[missing_mask, "code"].map(
                        backup_map[col]
                    )
            ctx.df = df
            self.logger.info(f"[FALLBACK] 官網 API 備援補充完成，共 {len(backup_df)} 筆")
        except Exception as e:
            self.logger.warning(f"[FALLBACK] 官網 API 備援失敗，繼續原流程：{e}")
