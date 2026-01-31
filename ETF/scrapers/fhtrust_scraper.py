import os
import logging
import pathlib
from datetime import datetime
from ..scrapers.unified_scraper import download_file
from ..parsers.xlsx_parser import parse_holdings_xlsx

logger = logging.getLogger(__name__)

# Constants
FUND_CODE = "49YTW"
BASE_URL = "https://www.ezmoney.com.tw" 
EXPORT_URL = f"{BASE_URL}/ETF/Fund/AssetExcelNPOI?fundCode={FUND_CODE}"

class FhTrustScraper:
    def __init__(self, output_dir: pathlib.Path):
         self.output_dir = output_dir

    def run(self):
        """
        Download and parse 00981A data.
        Returns: (DataFrame, data_date_str)
        """
        logger.info(f"Starting Scraper for 00981A ({FUND_CODE})...")
        
        # Temp file
        timestamp = int(datetime.now().timestamp())
        tmp_xlsx = self.output_dir / f"raw_00981A_{timestamp}.xlsx"
        
        if not download_file(EXPORT_URL, tmp_xlsx):
            logger.error("Download failed completely.")
            return None, None
            
        # Parse
        df, data_date = parse_holdings_xlsx(tmp_xlsx)
        
        if df.empty or not data_date:
            logger.error(f"Parsing failed or empty data. File kept at: {tmp_xlsx}")
            # Keep temp file for debugging
            return None, None
            
        # Rename raw file to standardized name
        final_xlsx = self.output_dir / f"00981A_raw_{data_date}.xlsx"
        
        # Remove original temp file if we renamed? Or rename IT.
        if final_xlsx.exists():
            logger.info(f"Raw file {final_xlsx} already exists. Overwriting.")
            os.remove(final_xlsx)
            
        tmp_xlsx.rename(final_xlsx)
        logger.info(f"Raw file saved to: {final_xlsx}")
        
        return df, data_date
