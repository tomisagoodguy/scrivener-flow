
import logging
import pandas as pd

logger = logging.getLogger(__name__)

class RevenueProcessor:
    @staticmethod
    def process(revenue_df: pd.DataFrame, revenue_yoy_df: pd.DataFrame, revenue_mom_df: pd.DataFrame, stock_list: list, months: int = 24) -> list:
        """
        處理月營收數據
        Returns: List of records ready for DB insertion
        """
        logger.info(f"Processing revenue data for {months} months...")
        
        if revenue_df.empty:
            return []
            
        valid_stocks = [s for s in stock_list if s in revenue_df.columns]
        
        # Last N months
        revenue_df = revenue_df[valid_stocks].tail(months)
        revenue_yoy_df = revenue_yoy_df[valid_stocks].tail(months) if not revenue_yoy_df.empty else pd.DataFrame()
        revenue_mom_df = revenue_mom_df[valid_stocks].tail(months) if not revenue_mom_df.empty else pd.DataFrame()
        
        records = []
        for date in revenue_df.index:
            for stock in valid_stocks:
                rev = revenue_df.loc[date, stock] if stock in revenue_df.columns else None
                yoy = revenue_yoy_df.loc[date, stock] if not revenue_yoy_df.empty and stock in revenue_yoy_df.columns else None
                mom = revenue_mom_df.loc[date, stock] if not revenue_mom_df.empty and stock in revenue_mom_df.columns else None
                
                if pd.notna(rev):
                    records.append({
                        'stock_code': stock,
                        'data_date': date.strftime('%Y-%m-%d'),
                        'revenue': float(str(rev)),
                        'revenue_yoy': float(str(yoy)) if pd.notna(yoy) else None,
                        'revenue_mom': float(str(mom)) if pd.notna(mom) else None
                    })
        return records
