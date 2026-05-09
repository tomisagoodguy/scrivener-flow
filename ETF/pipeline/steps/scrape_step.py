"""
Scrape Step

負責從網站抓取 ETF 持股資料（00981A 主流程）。

備援鏈：
  1. 官網 API（official_api_scraper）— 統一投信官方 endpoint
  2. ezmoney XLSX 爬蟲（FhTrustScraper）— 備援
  FinLab 價格補充由後續 PriceAttachStep 負責，此步驟不處理。
"""

from datetime import datetime, timedelta, timezone

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext


def _last_weekday() -> str:
    """回傳最近一個交易日的 YYYY-MM-DD 字串（台灣時間，15:00 前取前一交易日）。"""
    tw_now = datetime.now(timezone(timedelta(hours=8)))
    if tw_now.hour < 15:
        tw_now -= timedelta(days=1)
    d = tw_now.date()
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.isoformat()


class ScrapeStep(BaseStep):
    """抓取 00981A 持股資料"""

    @property
    def name(self) -> str:
        return "Scrape Holdings"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        df, date_str = self._try_official_api()

        if df is None or df.empty:
            self.logger.warning("[SCRAPE] 官網 API 失敗，fallback → ezmoney XLSX")
            df, date_str = self._try_fhtrust_scraper(ctx)

        if df is None or df.empty:
            raise ValueError("所有資料來源均失敗，無法取得 00981A 持股")

        # 統一欄位名稱：fhtrust_scraper 回傳 stock_code/stock_name，官網 API 回傳 code/name
        if "stock_code" in df.columns:
            df = df.rename(columns={"stock_code": "code", "stock_name": "name"})

        ctx.df = df
        ctx.date_str = date_str
        ctx.update_finlab_stock_list()
        self.logger.info(f"[SCRAPE] 取得 {date_str} 資料，共 {len(df)} 筆")
        return ctx

    def _try_official_api(self):
        try:
            from ETF.scrapers.official_api_scraper import fetch_holdings
            df = fetch_holdings("00981A")
            if df.empty:
                self.logger.warning("[SCRAPE] 官網 API 回傳空資料")
                return None, None
            date_str = _last_weekday()
            self.logger.info(f"[SCRAPE] 官網 API 成功，{len(df)} 筆")
            return df, date_str
        except Exception as e:
            self.logger.warning(f"[SCRAPE] 官網 API 例外：{e}")
            return None, None

    def _try_fhtrust_scraper(self, ctx: PipelineContext):
        try:
            from ETF.scrapers.fhtrust_scraper import FhTrustScraper
            scraper = FhTrustScraper(ctx.output_dir)
            df, date_str = scraper.run()
            if df is None or df.empty:
                self.logger.warning("[SCRAPE] ezmoney XLSX 回傳空資料")
                return None, None
            self.logger.info(f"[SCRAPE] ezmoney XLSX 成功，{len(df)} 筆")
            return df, date_str
        except Exception as e:
            self.logger.warning(f"[SCRAPE] ezmoney XLSX 例外：{e}")
            return None, None
