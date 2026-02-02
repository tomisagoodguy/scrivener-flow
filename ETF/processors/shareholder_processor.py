
import logging
import pandas as pd

logger = logging.getLogger(__name__)

class ShareholderProcessor:
    @staticmethod
    def process(inv_df: pd.DataFrame, stock_list: list) -> list:
        """
        處理股權分散數據
        Returns: List of records ready for DB insertion
        """
        logger.info("Processing shareholder data...")
        
        if inv_df.empty:
            return []
            
        inv_df = inv_df.reset_index()
        inv_df = inv_df[inv_df['stock_id'].isin(stock_list)]
        
        if inv_df.empty:
            return []
        
        # Last 48 weeks
        inv_df['date'] = pd.to_datetime(inv_df['date'])
        recent_dates = sorted(inv_df['date'].unique())[-48:]
        inv_df = inv_df[inv_df['date'].isin(recent_dates)]
        
        records = []
        for _, row in inv_df.iterrows():
            records.append({
                'stock_code': row['stock_id'],
                'data_date': row['date'].strftime('%Y-%m-%d'),
                'shareholder_tier': int(row['持股分級']),
                'holder_count': int(row['人數']) if pd.notna(row['人數']) else None,
                'shares_held': float(row['持有股數']) if pd.notna(row['持有股數']) else None,
                'custody_ratio': float(row['占集保庫存數比例']) if pd.notna(row['占集保庫存數比例']) else None
            })
            
        return records
