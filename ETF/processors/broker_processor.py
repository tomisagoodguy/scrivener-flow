
import logging
import pandas as pd

logger = logging.getLogger(__name__)

class BrokerProcessor:
    @staticmethod
    def process(buy_vol: pd.DataFrame, sell_vol: pd.DataFrame, close: pd.DataFrame, stock_list: list, days: int = 300) -> list:
        """
        處理券商買賣超數據，計算主力動能指標
        Returns: List of records ready for DB insertion
        """
        logger.info(f"Processing broker transactions for {days} days...")
        
        if buy_vol.empty or sell_vol.empty:
            logger.warning("No broker data to process")
            return []

        # Filter stocks
        buy_vol = buy_vol[buy_vol.columns.intersection(stock_list)]
        sell_vol = sell_vol[sell_vol.columns.intersection(stock_list)]
        
        if buy_vol.empty:
            return []
        
        # Align dates
        all_dates = buy_vol.index.intersection(sell_vol.index)
        if not close.empty:
            all_dates = all_dates.intersection(close.index)
        
        # 我們需要足夠的歷史數據來計算 60 天滾動指標 (Force Metric)
        # 所以實際處理的天數 = 請求的天數 + 60（如果是計算滾動數據的話）
        process_days = days + 60 if days < 300 else days
        target_dates = all_dates[-process_days:]
        
        if len(target_dates) > 0:
            logger.info(f"Target Date Range: {target_dates[0]} to {target_dates[-1]}")
            logger.info(f"Included {len(target_dates)} days")
        else:
            logger.warning("Target dates is empty!")

        buy_vol = buy_vol.loc[target_dates].fillna(0)
        sell_vol = sell_vol.loc[target_dates].fillna(0)
        close = close.loc[target_dates] if not close.empty else pd.DataFrame(1, index=target_dates, columns=buy_vol.columns)
        
        # Calculate Indicators
        net_vol_raw = buy_vol - sell_vol
        net_volume = net_vol_raw * close
        
        # Force Indicator: net_volume.rolling(60).mean() / net_volume.rolling(60).std()
        force = net_volume.rolling(60).mean() / net_volume.rolling(60).std()
        
        # Transform to Records
        buy_s = buy_vol.stack()
        buy_s.name = 'buy_amount'
        sell_s = sell_vol.stack()
        sell_s.name = 'sell_amount'
        net_vol_s = net_volume.stack()
        net_vol_s.name = 'net_volume'
        force_s = force.stack()
        force_s.name = 'force_metric'
        
        merged = pd.concat([buy_s, sell_s, net_vol_s, force_s], axis=1)
        
        # 只保留請求的天數 (切除為了計算 rolling 而多抓的部分)
        if days < 300:
            final_dates = all_dates[-days:]
            merged = merged.loc[final_dates]

        records = []
        for idx, row in merged.iterrows():
            date, stock = idx  # type: ignore[misc]
            if row['buy_amount'] == 0 and row['sell_amount'] == 0 and pd.isna(row['force_metric']):
                continue
                
            records.append({
                'stock_code': stock,
                'data_date': date.strftime('%Y-%m-%d'),
                'buy_amount': float(row['buy_amount']),
                'sell_amount': float(row['sell_amount']),
                'net_volume': float(row['net_volume']),
                'force_metric': float(row['force_metric']) if pd.notna(row['force_metric']) else None
            })
            
        # Reverse to process newest data first
        records.reverse()
        return records
