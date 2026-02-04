"""
Price Data Service

負責價格資料附加（從 attach_prices 抽離）。
"""

import logging
import pandas as pd
from datetime import datetime
from typing import Optional

from .client import FinlabClient
from ..indicators import calculate_new_highs, calculate_volatility, calculate_revenue_momentum

logger = logging.getLogger(__name__)


class PriceDataService:
    """
    價格資料附加服務。
    
    職責：
    - 附加收盤價
    - 附加成交金額
    - 附加融資使用率
    - 附加波動度
    - 附加營收指標
    """
    
    def __init__(self, client: FinlabClient = None):
        self.client = client or FinlabClient()
    
    def attach(self, df: pd.DataFrame, date_str: str) -> pd.DataFrame:
        """
        附加價格與相關指標至持股 DataFrame。
        
        Args:
            df: 持股 DataFrame（需包含 code 欄位）
            date_str: 資料日期
            
        Returns:
            附加指標後的 DataFrame
        """
        if not self.client.login():
            logger.warning("Finlab login failed. Returning original DataFrame.")
            df['price'] = None
            df['currency'] = None
            return df

        try:
            # 獲取基礎資料
            price_df = self.client.get_data('close')
            amount_df = self.client.get_data('amount')
            margin_df = self.client.get_data('margin_usage')
            
            if margin_df.empty and not price_df.empty:
                margin_df = pd.DataFrame(0, index=price_df.index, columns=price_df.columns)
            
            if price_df.empty:
                logger.warning("Finlab returned empty price. Skipping price attachment.")
                return self._set_empty_columns(df)

            # 正規化日期
            target_date = self._normalize_date(date_str)
            
            # 取得目標日期或最近日期的資料
            latest_prices, latest_changes, actual_date = self._get_prices_for_date(
                price_df, target_date
            )
            latest_amounts = self._get_data_for_date(amount_df, target_date)
            latest_margins = self._get_data_for_date(margin_df, target_date)
            
            # 清理索引
            latest_prices.index = latest_prices.index.astype(str).str.strip()
            latest_changes.index = latest_changes.index.astype(str).str.strip()
            if latest_amounts is not None:
                latest_amounts.index = latest_amounts.index.astype(str).str.strip()
            if latest_margins is not None:
                latest_margins.index = latest_margins.index.astype(str).str.strip()

            # 市值
            latest_mcap = self._get_market_cap(target_date)
            
            # 新高標記
            high_flags = calculate_new_highs(price_df, target_date)
            
            # 波動度
            latest_volatility = self._calculate_volatility(target_date)
            
            # 營收指標
            rev_data = self._get_revenue_data(target_date)
            
            # 附加至 DataFrame
            codes = df['code'].str.strip()
            df = self._map_to_dataframe(
                df, codes, 
                latest_prices, latest_changes, latest_amounts, 
                latest_margins, latest_mcap, latest_volatility,
                high_flags, rev_data
            )
            
            valid_count = df['price'].notnull().sum()
            logger.info(f"Attached {valid_count} prices, stats and volatility.")
            return df
            
        except Exception as e:
            logger.error(f"Error in attach_prices: {e}", exc_info=True)
            df['price'] = None
            df['currency'] = None
            return df
    
    def _normalize_date(self, date_str: str) -> str:
        """正規化日期格式"""
        clean_date = date_str.replace("-", "").replace("/", "")
        try:
            return datetime.strptime(clean_date, "%Y%m%d").strftime("%Y-%m-%d")
        except Exception:
            logger.warning(f"Could not parse date_str '{date_str}'. Using current date.")
            return datetime.today().strftime("%Y-%m-%d")
    
    def _get_prices_for_date(self, price_df: pd.DataFrame, target_date: str):
        """取得指定日期的價格和漲跌幅"""
        if target_date in price_df.index:
            latest_prices = price_df.loc[target_date]
            
            idx_pos = price_df.index.get_loc(target_date)
            if isinstance(idx_pos, slice):
                idx_pos = idx_pos.stop - 1

            if idx_pos > 0:
                prev_prices = price_df.iloc[idx_pos - 1]
                latest_changes = ((latest_prices - prev_prices) / prev_prices) * 100
            else:
                latest_changes = pd.Series(0.0, index=latest_prices.index)
                
            logger.info(f"Using prices from target date: {target_date}")
            return latest_prices, latest_changes, target_date
        else:
            logger.warning(f"Target date {target_date} not in Finlab. Using most recent.")
            latest_prices = price_df.iloc[-1]
            
            if len(price_df) > 1:
                prev_prices = price_df.iloc[-2]
                latest_changes = ((latest_prices - prev_prices) / prev_prices) * 100
            else:
                latest_changes = pd.Series(0.0, index=latest_prices.index)
                
            return latest_prices, latest_changes, str(price_df.index[-1])
    
    def _get_data_for_date(self, df: pd.DataFrame, target_date: str) -> Optional[pd.Series]:
        """取得指定日期的資料"""
        if df.empty:
            return None
        if target_date in df.index:
            return df.loc[target_date]
        return df.iloc[-1]
    
    def _get_market_cap(self, target_date: str) -> Optional[pd.Series]:
        """取得市值資料"""
        market_cap_df = self.client.get_data('market_cap')
        if market_cap_df.empty:
            return None
        latest_mcap = self._get_data_for_date(market_cap_df, target_date)
        if latest_mcap is not None:
            latest_mcap.index = latest_mcap.index.astype(str).str.strip()
        return latest_mcap
    
    def _calculate_volatility(self, target_date: str) -> Optional[pd.Series]:
        """計算波動度"""
        price_df = self.client.get_data('close')
        open_df = self.client.get_data('open')
        high_df = self.client.get_data('high')
        low_df = self.client.get_data('low')
        
        if open_df.empty or high_df.empty or low_df.empty:
            return None
            
        volatility = calculate_volatility(price_df, high_df, low_df, open_df, target_date)
        if volatility is not None:
            volatility.index = volatility.index.astype(str).str.strip()
        return volatility
    
    def _get_revenue_data(self, target_date: str) -> dict:
        """取得營收相關資料"""
        rev_df = self.client.get_data('monthly_revenue')
        rev_yoy_df = self.client.get_data('monthly_revenue_yoy')
        rev_mom_df = self.client.get_data('revenue_mom')
        
        result = {
            'revenue': None,
            'yoy': None,
            'mom': None,
            'momentum': None
        }
        
        if not rev_df.empty:
            result['revenue'] = self._get_data_for_date(rev_df, target_date)
            if result['revenue'] is not None:
                result['revenue'].index = result['revenue'].index.astype(str).str.strip()
            
            result['momentum'] = calculate_revenue_momentum(rev_df, target_date)
            if result['momentum'] is not None:
                result['momentum'].index = result['momentum'].index.astype(str).str.strip()
        
        if not rev_yoy_df.empty:
            result['yoy'] = self._get_data_for_date(rev_yoy_df, target_date)
            if result['yoy'] is not None:
                result['yoy'].index = result['yoy'].index.astype(str).str.strip()
        
        if not rev_mom_df.empty:
            result['mom'] = self._get_data_for_date(rev_mom_df, target_date)
            if result['mom'] is not None:
                result['mom'].index = result['mom'].index.astype(str).str.strip()
        
        return result
    
    def _map_to_dataframe(self, df, codes, prices, changes, amounts, 
                          margins, mcap, volatility, high_flags, rev_data):
        """將資料映射至 DataFrame"""
        df['price'] = codes.map(prices)
        df['change_percent'] = codes.map(changes)
        df['amount'] = codes.map(amounts) if amounts is not None else None
        df['margin_ratio'] = codes.map(margins) if margins is not None else 0
        df['market_cap'] = codes.map(mcap) if mcap is not None else None
        df['volatility'] = codes.map(volatility) if volatility is not None else None
        
        df['monthly_revenue'] = codes.map(rev_data['revenue']) if rev_data['revenue'] is not None else None
        df['revenue_yoy'] = codes.map(rev_data['yoy']) if rev_data['yoy'] is not None else None
        df['revenue_mom'] = codes.map(rev_data['mom']) if rev_data['mom'] is not None else None
        df['revenue_momentum_rank'] = codes.map(rev_data['momentum']) if rev_data['momentum'] is not None else None
        
        # 新高標記
        if high_flags is not None:
            for col in ['is_high_5d', 'is_high_20d', 'is_high_200d']:
                if col in high_flags.columns:
                    series = high_flags[col]
                    series.index = series.index.astype(str).str.strip()
                    df[col] = codes.map(series).fillna(False)
        else:
            df['is_high_5d'] = False
            df['is_high_20d'] = False
            df['is_high_200d'] = False

        df['margin_ratio'] = df['margin_ratio'].fillna(0)
        df['currency'] = 'TWD'
        
        return df
    
    def _set_empty_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """設定空的價格欄位"""
        df['price'] = None
        df['change_percent'] = 0.0
        df['amount'] = None
        df['margin_ratio'] = 0.0
        df['volatility'] = None
        df['currency'] = None
        return df
