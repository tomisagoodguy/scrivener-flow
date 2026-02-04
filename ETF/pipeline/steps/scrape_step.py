"""
Scrape Step

負責從網站抓取 ETF 持股資料。
"""

from .base import BaseStep
from ETF.pipeline.context import PipelineContext


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
        
        records_count = len(df)
        self.logger.info(f"Scraped data for {date_str}. Records: {records_count}")
        
        return ctx
