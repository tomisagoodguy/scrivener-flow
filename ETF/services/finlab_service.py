import os
import logging
import pandas as pd
import finlab
from finlab import data
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class FinlabService:
    def __init__(self, stock_list: List[str] = None):
        self.api_key = os.getenv("FINLAB_API_KEY")
        self.stock_list = stock_list or ["0050", "00981"] # Default if none provided
        self.all_data = {}
        self.params = {
            'max_data_days': 2500 # Default to ~10 years of trading days
        }

    def login(self):
        if not self.api_key:
            logger.error("FINLAB_API_KEY not found in environment.")
            return False
        try:
            finlab.login(self.api_key)
            return True
        except Exception as e:
            logger.error(f"Finlab login failed: {e}")
            return False

    def preload_market_data(self):
        """
        [v9.1.1 當沖佔比修正版]
        Preload essential market data for analysis.
        """
        if not self.login():
            return

        logger.info("正在預加載所有市場數據...")
        max_days = self.params.get('max_data_days', 2500)
        
        data_items = {
            "open": "price:開盤價", 
            "high": "price:最高價", 
            "low": "price:最低價", 
            "close": "price:收盤價", 
            "volume": "price:成交股數",
            "foreign_buy": "institutional_investors_trading_summary:外陸資買賣超股數(不含外資自營商)",
            "it_buy": "institutional_investors_trading_summary:投信買賣超股數",
            "dealer_buy": "institutional_investors_trading_summary:自營商買賣超股數(自行買賣)",
            "margin_balance": "margin_transactions:融資今日餘額",
            "short_balance": "margin_transactions:融券今日餘額",
            "margin_usage": "margin_transactions:融資使用率",
            "short_usage": "margin_transactions:融券使用率",
            "monthly_revenue": "monthly_revenue:當月營收",
            "monthly_revenue_yoy": "monthly_revenue:去年同月增減(%)",
            "top15_buy": "etl:broker_transactions:top15_buy",
            "top15_sell": "etl:broker_transactions:top15_sell",
            "market_cap": "etl:market_value",
            "day_trade_vol": "intraday_trading:當日沖銷交易成交股數",
            'gross_margin': 'fundamental_features:營業毛利率',
            'operating_margin': 'fundamental_features:營業利益率',
            'roe': 'fundamental_features:ROE稅後',
            'eps': 'financial_statement:每股盈餘'
        }

        loaded_dfs = {}
        for name, dhead in data_items.items():
            logger.info(f"正在加載: {dhead}")
            try:
                full_df = data.get(dhead)
                # Only keep stocks in our list if specified
                if self.stock_list:
                    valid_stocks = [s for s in self.stock_list if s in full_df.columns]
                    loaded_dfs[name] = full_df[valid_stocks]
                else:
                    loaded_dfs[name] = full_df
            except Exception as e:
                logger.error(f"加載數據 '{dhead}' 失敗: {e}")
                loaded_dfs[name] = pd.DataFrame()

        if not loaded_dfs:
            logger.error("沒有任何數據成功加載。")
            self.all_data = {}
            return

        # Consistency check
        reference_df = loaded_dfs.get('close', pd.DataFrame())
        if reference_df.empty:
            logger.warn("Close price data is empty. Skipping consistency check.")
            self.all_data = loaded_dfs
            return

        common_stocks = set(reference_df.columns)
        for name, df in loaded_dfs.items():
            if name == 'close' or df.empty:
                continue
            common_stocks.intersection_update(df.columns)

        common_stocks = sorted(list(common_stocks))
        logger.info(f"經過數據一致性檢查，找到 {len(common_stocks)} 檔在所有表中都有數據的股票。")

        for name, df in loaded_dfs.items():
            if df.empty:
                self.all_data[name] = pd.DataFrame()
                continue
                
            # Tail appropriate number of days
            limit = max_days if "monthly" not in name else 48
            self.all_data[name] = df[common_stocks].tail(limit)

        if 'volume' in self.all_data and not self.all_data['volume'].empty:
            self.all_data['volume'] /= 1000 # Convert to units if needed (or based on original code)

        # Equity Structure
        self._calculate_equity_structure(common_stocks)

        logger.info("Finlab 數據預加載完成。")

    def _calculate_equity_structure(self, common_stocks):
        logger.info("正在計算新的股權結構指標...")
        try:
            inv = data.get('inventory')
            inv_df = inv.reset_index()
            inv_filtered = inv_df[inv_df['stock_id'].isin(common_stocks)]
            if inv_filtered.empty:
                raise ValueError("在指定的股票清單中，未找到任何對應的股權分級資料。")
            
            self.all_data['inventory_weekly_data'] = inv_filtered
            
            h1_data = inv_filtered[inv_filtered['持股分級'].astype(int) <= 4]
            h2_data = inv_filtered[(inv_filtered['持股分級'].astype(int) >= 11) & (inv_filtered['持股分級'].astype(int) <= 14)]
            h1 = h1_data.groupby(['date', 'stock_id'], observed=True)['持有股數'].sum().unstack()
            h2 = h2_data.groupby(['date', 'stock_id'], observed=True)['持有股數'].sum().unstack()
            
            if h1.empty or h2.empty:
                 raise ValueError("計算大戶(h2)或散戶(h1)持股時，其中一方資料為空。")
            
            shareholder_ratio = (h2 / (h1 + h2)).reindex(columns=common_stocks)
            shareholder_ratio.index = pd.to_datetime(shareholder_ratio.index)
            self.all_data['shareholder_ratio'] = shareholder_ratio
            self.all_data['shareholder_ratio_diff1'] = shareholder_ratio.diff(6)
            self.all_data['shareholder_ratio_diff2'] = self.all_data['shareholder_ratio_diff1'].diff(6)

            # Distribution
            share_level_map = {
                '200-400張': [11], '400-600張': [12], '600-800張': [13],
                '800-1000張': [14], '1000張+': [15]
            }
            dist_data_frames = {}
            for label, levels in share_level_map.items():
                tier_data = inv_filtered[inv_filtered['持股分級'].astype(int).isin(levels)]
                dist_data_frames[label] = tier_data.groupby(['date', 'stock_id'], observed=True)['持有股數'].sum().unstack() / 1000

            total_shareholders_data = inv_filtered[inv_filtered['持股分級'].astype(int) == 17]
            dist_data_frames['總人數'] = total_shareholders_data.groupby(['date', 'stock_id'], observed=True)['人數'].sum().unstack()
            
            self.all_data['shareholder_distribution'] = pd.concat(dist_data_frames, axis=1)
            self.all_data['shareholder_distribution'].index = pd.to_datetime(self.all_data['shareholder_distribution'].index)

        except Exception as e:
            logger.error(f"計算股權結構指標時出錯: {e}")
            # Fill with empty if failed
            date_index = self.all_data.get('close', pd.DataFrame()).index
            empty_df = pd.DataFrame(index=date_index, columns=common_stocks)
            self.all_data.update({
                'shareholder_ratio': empty_df, 
                'shareholder_ratio_diff1': empty_df,
                'shareholder_ratio_diff2': empty_df, 
                'shareholder_distribution': pd.DataFrame()
            })

    def get_ohlcv(self, stock_list: List[str], days: int = 250) -> pd.DataFrame:
        """
        Fetch OHLCV data for a list of stocks.
        Returns a long-format DataFrame with cols: [stock_id, date, open, high, low, close, volume]
        """
        if not self.login():
            return pd.DataFrame()

        try:
            logger.info(f"Fetching OHLCV for {len(stock_list)} stocks, last {days} days...")
            
            # Use valid stocks only
            all_close = data.get('price:收盤價')
            valid_list = [s for s in stock_list if s in all_close.columns]
            
            o = data.get('price:開盤價')[valid_list].tail(days).stack()
            h = data.get('price:最高價')[valid_list].tail(days).stack()
            l = data.get('price:最低價')[valid_list].tail(days).stack()
            c = data.get('price:收盤價')[valid_list].tail(days).stack()
            v = data.get('price:成交股數')[valid_list].tail(days).stack()

            df = pd.concat([o, h, l, c, v], axis=1)
            df.columns = ['open', 'high', 'low', 'close', 'volume']
            df.index.names = ['date', 'stock_id']
            
            return df.reset_index()
        except Exception as e:
            logger.error(f"Error fetching OHLCV from Finlab: {e}")
            return pd.DataFrame()
