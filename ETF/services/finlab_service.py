import os
import logging
import pandas as pd
import finlab
from finlab import data
from typing import List, Dict, Any, Optional
from .indicators import calculate_new_highs, calculate_volatility, calculate_revenue_momentum

logger = logging.getLogger(__name__)

class FinlabService:
    DATA_MAP = {
        "open": "price:開盤價", 
        "high": "price:最高價", 
        "low": "price:最低價", 
        "close": "price:收盤價", 
        "volume": "price:成交股數",
        "amount": "price:成交金額",
        "foreign_buy": "institutional_investors_trading_summary:外陸資買賣超股數(不含外資自營商)",
        "it_buy": "institutional_investors_trading_summary:投信買賣超股數",
        "dealer_buy": "institutional_investors_trading_summary:自營商買賣超股數(自行買賣)",
        "margin_balance": "margin_transactions:融資今日餘額",
        "short_balance": "margin_transactions:融券今日餘額",
        "margin_usage": "margin_transactions:融資使用率",
        "short_usage": "margin_transactions:融券使用率",
        "monthly_revenue": "monthly_revenue:當月營收",
        "monthly_revenue_yoy": "monthly_revenue:去年同月增減(%)",
        'revenue_mom': 'monthly_revenue:前期比較增減(%)',
        'top15_buy': 'etl:broker_transactions:top15_buy',
        "top15_sell": "etl:broker_transactions:top15_sell",
        "market_cap": "etl:market_value",
        "day_trade_vol": "intraday_trading:當日沖銷交易成交股數",
        'gross_margin': 'fundamental_features:營業毛利率',
        'operating_margin': 'fundamental_features:營業利益率',
        'roe': 'fundamental_features:ROE稅後',
        'eps': 'financial_statement:每股盈餘'
    }

    def __init__(self, stock_list: List[str] = None):
        self.api_key = os.getenv("FINLAB_API_KEY")
        self.stock_list = stock_list or ["0050", "00981"] # Default if none provided
        self.all_data = {} # For preload_market_data results
        self.raw_cache = {} # Cache for raw finlab downloads
        self.params = {
            'max_data_days': 2500 # Default to ~10 years of trading days
        }

    def _get_data(self, key: str) -> pd.DataFrame:
        """
         unified data fetching method.
         1. Check if key is effective alias in DATA_MAP, else assume it's a direct finlab command.
         2. Check self.raw_cache.
         3. Fetch and cache.
        """
        finlab_cmd = self.DATA_MAP.get(key, key)
        
        if key in self.raw_cache:
            return self.raw_cache[key]
        
        try:
            # logger.info(f"Fetching {key} ({finlab_cmd}) from Finlab...")
            df = data.get(finlab_cmd)
            self.raw_cache[key] = df
            return df
        except Exception as e:
            logger.error(f"Failed to fetch data '{key}' ({finlab_cmd}): {e}")
            return pd.DataFrame()

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
        
        # Use centralized DATA_MAP
        loaded_dfs = {}
        for name in self.DATA_MAP:
            # logger.info(f"正在加載: {self.DATA_MAP[name]}")
            full_df = self._get_data(name)
            
            if full_df.empty:
                loaded_dfs[name] = pd.DataFrame()
                continue

            # Only keep stocks in our list if specified
            if self.stock_list:
                valid_stocks = [s for s in self.stock_list if s in full_df.columns]
                loaded_dfs[name] = full_df[valid_stocks]
            else:
                loaded_dfs[name] = full_df

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
            # Use raw data for calculation, filtered by stocks
            inv = self._get_data('inventory') # 'inventory' is not in DATA_MAP, but _get_data handles pass-through or we should add it
            if inv.empty:
                 # Try directly if not mapped
                 try:
                     inv = data.get('inventory')
                 except:
                     raise ValueError("Cannot fetch inventory data")

            inv_df = inv.reset_index()
            inv_filtered = inv_df[inv_df['stock_id'].isin(common_stocks)]
            if inv_filtered.empty:
                # raise ValueError("在指定的股票清單中，未找到任何對應的股權分級資料。")
                logger.warning("在指定的股票清單中，未找到任何對應的股權分級資料。Skip equity structure.")
                return 
            
            self.all_data['inventory_weekly_data'] = inv_filtered
            
            h1_data = inv_filtered[inv_filtered['持股分級'].astype(int) <= 4]
            h2_data = inv_filtered[(inv_filtered['持股分級'].astype(int) >= 11) & (inv_filtered['持股分級'].astype(int) <= 14)]
            h1 = h1_data.groupby(['date', 'stock_id'], observed=True)['持有股數'].sum().unstack()
            h2 = h2_data.groupby(['date', 'stock_id'], observed=True)['持有股數'].sum().unstack()
            
            if h1.empty or h2.empty:
                 # raise ValueError("計算大戶(h2)或散戶(h1)持股時，其中一方資料為空。")
                 logger.warning("計算大戶(h2)或散戶(h1)持股時，其中一方資料為空。Skip ratio.")
                 return
            
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
            self.all_data.update({
                'shareholder_ratio': empty_df, 
                'shareholder_ratio_diff1': empty_df,
                'shareholder_ratio_diff2': empty_df, 
                'shareholder_distribution': pd.DataFrame()
            })

    def attach_prices(self, df: pd.DataFrame, date_str: str) -> pd.DataFrame:
        """
        Attach closing prices from Finlab to the provided ETF holdings DataFrame.
        """
        if not self.login():
            logger.warning("Finlab login failed. Returning original DataFrame.")
            df['price'] = None
            df['currency'] = None
            return df

        try:
            from datetime import datetime
            
            price_df = self._get_data('close')
            amount_df = self._get_data('amount')
            margin_df = self._get_data('margin_usage')
            
            if margin_df.empty and not price_df.empty:
                margin_df = pd.DataFrame(0, index=price_df.index, columns=price_df.columns)
            
            if price_df.empty:
                logger.warning("Finlab returned empty price. Skipping price attachment.")
                df['price'] = None
                df['change_percent'] = 0.0
                df['amount'] = None
                df['margin_ratio'] = 0.0
                df['volatility'] = None
                df['currency'] = None
                return df

            # Normalize target date
            clean_date = date_str.replace("-", "").replace("/", "")
            try:
                target_date = datetime.strptime(clean_date, "%Y%m%d").strftime("%Y-%m-%d")
            except Exception:
                logger.warning(f"Could not parse date_str '{date_str}'. Using current date.")
                target_date = datetime.today().strftime("%Y-%m-%d")

            if target_date in price_df.index:
                # Use .loc for labeled access to ensure correctness
                latest_prices = price_df.loc[target_date]
                latest_amounts = amount_df.loc[target_date] if target_date in amount_df.index else None
                latest_margins = margin_df.loc[target_date] if target_date in margin_df.index else None
                
                # Calculate change
                idx_pos = price_df.index.get_loc(target_date)
                # Handle slice if multiple entries (unlikely for daily data)
                if isinstance(idx_pos, slice):
                     idx_pos = idx_pos.stop - 1

                if idx_pos > 0:
                    prev_prices = price_df.iloc[idx_pos - 1]
                    latest_changes = ((latest_prices - prev_prices) / prev_prices) * 100
                else:
                    latest_changes = pd.Series(0.0, index=latest_prices.index)
                    
                logger.info(f"Using prices/amounts/margins from target date: {target_date}")
            else:
                logger.warning(f"Target date {target_date} not in Finlab. Using most recent available.")
                latest_prices = price_df.iloc[-1]
                latest_amounts = amount_df.iloc[-1] if not amount_df.empty else None
                latest_margins = margin_df.iloc[-1] if not margin_df.empty else None
                
                if len(price_df) > 1:
                    prev_prices = price_df.iloc[-2]
                    latest_changes = ((latest_prices - prev_prices) / prev_prices) * 100
                else:
                    latest_changes = pd.Series(0.0, index=latest_prices.index)

            # Cleanup symbols in index
            latest_prices.index = latest_prices.index.astype(str).str.strip()
            latest_changes.index = latest_changes.index.astype(str).str.strip()
            if latest_amounts is not None:
                latest_amounts.index = latest_amounts.index.astype(str).str.strip()
            if latest_margins is not None:
                latest_margins.index = latest_margins.index.astype(str).str.strip()

            # --- Market Cap ---
            market_cap_df = self._get_data('market_cap')
            if target_date in market_cap_df.index:
                latest_mcap = market_cap_df.loc[target_date]
            else:
                latest_mcap = market_cap_df.iloc[-1] if not market_cap_df.empty else None
            
            if latest_mcap is not None:
                latest_mcap.index = latest_mcap.index.astype(str).str.strip()

            # --- New Highs ---
            high_flags = calculate_new_highs(price_df, target_date)

            # Volatility calculation
            # Need open/high/low for volatility
            open_df = self._get_data('open')
            high_df = self._get_data('high')
            low_df = self._get_data('low')
            
            latest_volatility = None
            if not open_df.empty and not high_df.empty and not low_df.empty:
                latest_volatility = calculate_volatility(price_df, high_df, low_df, open_df, target_date)
            
            if latest_volatility is not None:
                latest_volatility.index = latest_volatility.index.astype(str).str.strip()
            
            # monthly_revenue, monthly_revenue_yoy, monthly_revenue_mom
            rev_df = self._get_data('monthly_revenue')
            rev_yoy_df = self._get_data('monthly_revenue_yoy')
            rev_mom_df = self._get_data('revenue_mom')
            
            latest_rev = None
            latest_rev_yoy = None
            latest_rev_mom = None
            latest_momentum = None
            
            if not rev_df.empty:
                if target_date in rev_df.index:
                     latest_rev = rev_df.loc[target_date]
                else:
                     latest_rev = rev_df.iloc[-1]
                latest_rev.index = latest_rev.index.astype(str).str.strip()

                # Calculate Momentum
                latest_momentum = calculate_revenue_momentum(rev_df, target_date)
                if latest_momentum is not None:
                    latest_momentum.index = latest_momentum.index.astype(str).str.strip()

            if not rev_yoy_df.empty:
                if target_date in rev_yoy_df.index:
                    latest_rev_yoy = rev_yoy_df.loc[target_date]
                else:
                    latest_rev_yoy = rev_yoy_df.iloc[-1]
                latest_rev_yoy.index = latest_rev_yoy.index.astype(str).str.strip()

            if not rev_mom_df.empty:
                if target_date in rev_mom_df.index:
                    latest_rev_mom = rev_mom_df.loc[target_date]
                else:
                    latest_rev_mom = rev_mom_df.iloc[-1]
                latest_rev_mom.index = latest_rev_mom.index.astype(str).str.strip()


            codes = df['code'].str.strip()
            df['price'] = codes.map(latest_prices)
            df['change_percent'] = codes.map(latest_changes)
            df['amount'] = codes.map(latest_amounts) if latest_amounts is not None else None
            df['margin_ratio'] = codes.map(latest_margins) if latest_margins is not None else 0
            df['market_cap'] = codes.map(latest_mcap) if latest_mcap is not None else None
            df['volatility'] = codes.map(latest_volatility) if latest_volatility is not None else None
            
            df['monthly_revenue'] = codes.map(latest_rev) if latest_rev is not None else None
            df['revenue_yoy'] = codes.map(latest_rev_yoy) if latest_rev_yoy is not None else None
            df['revenue_mom'] = codes.map(latest_rev_mom) if latest_rev_mom is not None else None
            df['revenue_momentum_rank'] = codes.map(latest_momentum) if latest_momentum is not None else None
            
            # Map high flags
            if high_flags is not None:
                for col in ['is_high_5d', 'is_high_20d', 'is_high_200d']:
                    if col in high_flags.columns:
                        # Ensure boolean
                        series = high_flags[col]
                        series.index = series.index.astype(str).str.strip()
                        df[col] = codes.map(series).fillna(False)
            else:
                 df['is_high_5d'] = False
                 df['is_high_20d'] = False
                 df['is_high_200d'] = False

            df['margin_ratio'] = df['margin_ratio'].fillna(0)
            df['currency'] = 'TWD'
            
            valid_count = df['price'].notnull().sum()
            logger.info(f"Attached {valid_count} prices, stats and volatility.")
            return df
        except Exception as e:
            logger.error(f"Error in attach_prices: {e}", exc_info=True)
            df['price'] = None
            df['currency'] = None
            return df

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
            all_close = self._get_data('close')
            if all_close.empty: 
                return pd.DataFrame()

            valid_list = [s for s in stock_list if s in all_close.columns]
            
            o = self._get_data('open')[valid_list].tail(days).stack()
            h = self._get_data('high')[valid_list].tail(days).stack()
            l = self._get_data('low')[valid_list].tail(days).stack()
            c = all_close[valid_list].tail(days).stack()
            v = self._get_data('volume')[valid_list].tail(days).stack()
            amt = self._get_data('amount')[valid_list].tail(days).stack()
            
            # Use a safe fetch for margin ratio
            m_raw = self._get_data('margin_usage')
            if not m_raw.empty:
                m_ratio = m_raw[valid_list].tail(days).stack()
            else:
                m_ratio = pd.Series(0, index=o.index)

            df = pd.concat([o, h, l, c, v, amt, m_ratio], axis=1)
            df.columns = ['open', 'high', 'low', 'close', 'volume', 'amount', 'margin_ratio']
            df.index.names = ['date', 'stock_id']
            
            # Fill NaN for margin_ratio
            df['margin_ratio'] = df['margin_ratio'].fillna(0)
            
            return df.reset_index()
        except Exception as e:
            logger.error(f"Error fetching OHLCV from Finlab: {e}")
            return pd.DataFrame()
