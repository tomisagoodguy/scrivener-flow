import logging
import pandas as pd
import requests
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class ETFStorage:
    def __init__(self):
        # Load env
        if os.path.exists('.env.local'):
            load_dotenv('.env.local')
        else:
            load_dotenv()

        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.service_role_key:
            logger.error("Missing Supabase REST credentials.")
            raise ValueError("Missing Supabase REST credentials (URL or Service Role Key)")

        self.headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

    def get_latest_date(self, etf_code: str) -> Optional[str]:
        """
        Get the most recent data_date from DB.
        """
        url_dates = f"{self.supabase_url}/rest/v1/etf_holdings_snapshot"
        params_dates = {
            "etf_code": f"eq.{etf_code}",
            "select": "data_date",
            "order": "data_date.desc",
            "limit": "1"
        }
        try:
            resp = requests.get(url_dates, headers=self.headers, params=params_dates)
            resp.raise_for_status()
            data = resp.json()
            if data and data[0]:
                return data[0]['data_date']
            return None
        except Exception as e:
            logger.error(f"Error getting latest date: {e}")
            return None

    def get_snapshot_by_index(self, etf_code: str, index: int = 0) -> pd.DataFrame:
        """
        Get snapshot by reverse chronological index (0 = latest, 1 = previous, etc.)
        """
        url_dates = f"{self.supabase_url}/rest/v1/etf_holdings_snapshot"
        params_dates = {
            "etf_code": f"eq.{etf_code}",
            "select": "data_date",
            "order": "data_date.desc"
        }
        try:
            resp = requests.get(url_dates, headers=self.headers, params=params_dates)
            resp.raise_for_status()
            all_dates = sorted(list(set([r['data_date'] for r in resp.json()])), reverse=True)
            
            if not all_dates or index >= len(all_dates):
                return pd.DataFrame()
            
            target_date = all_dates[index]
            logger.info(f"Fetching snapshot for index {index}: {target_date}")
            return self.get_snapshot_from_date(etf_code, target_date)
        except Exception as e:
            logger.error(f"Error getting snapshot by index {index}: {e}")
            return pd.DataFrame()

    def get_latest_snapshot(self, etf_code: str) -> pd.DataFrame:
        """
        Get the most recent snapshot available in DB.
        """
        # 1. Get the latest date
        latest_date = self.get_latest_date(etf_code)
        if not latest_date:
            return pd.DataFrame()
        return self.get_snapshot_from_date(etf_code, latest_date)

    def get_snapshot_days_ago(self, etf_code: str, days_ago: int = 5) -> pd.DataFrame:
        """
        Get a snapshot from approximately N data-days ago.
        """
        url_dates = f"{self.supabase_url}/rest/v1/etf_holdings_snapshot"
        params_dates = {
            "etf_code": f"eq.{etf_code}",
            "select": "data_date",
            "order": "data_date.desc"
        }
        try:
            resp = requests.get(url_dates, headers=self.headers, params=params_dates)
            resp.raise_for_status()
            # Get unique dates
            all_dates = sorted(list(set([r['data_date'] for r in resp.json()])), reverse=True)
            
            if not all_dates:
                return pd.DataFrame()
            
            # Target is the Nth date back (0-indexed, so days_ago 1 is yesterday)
            target_idx = min(len(all_dates) - 1, days_ago)
            target_date = all_dates[target_idx]
            
            logger.info(f"Comparing with snapshot from {target_date} ({target_idx} records ago)")
            return self.get_snapshot_from_date(etf_code, target_date)
        except Exception as e:
            logger.error(f"Error finding historical date: {e}")
            return pd.DataFrame()

    def get_snapshot_from_date(self, etf_code: str, target_date: str) -> pd.DataFrame:
        """
        Fetch holdings for a specific date.
        """
        url = f"{self.supabase_url}/rest/v1/etf_holdings_snapshot"
        params = {
            "etf_code": f"eq.{etf_code}",
            "data_date": f"eq.{target_date}",
            "select": "stock_code,stock_name,shares,weight,data_date,price,currency,amount,margin_ratio,change_percent,volatility,market_cap,is_high_5d,is_high_20d,is_high_200d,monthly_revenue,revenue_yoy,revenue_mom,revenue_momentum_rank"
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data:
                return pd.DataFrame()
                
            df = pd.DataFrame(data)
            df = df.rename(columns={"stock_code": "code", "stock_name": "name"})
            df['shares'] = df['shares'].astype(int)
            df['weight'] = df['weight'].astype(float)
            if 'price' in df.columns:
                df['price'] = pd.to_numeric(df['price'], errors='coerce')
            return df
        except Exception as e:
            logger.error(f"Error fetching snapshot for {target_date}: {e}")
            return pd.DataFrame()

    def save_snapshot(self, df: pd.DataFrame, etf_code: str, data_date: str):
        """
        Save snapshot to DB. Uses UPSERT logic based on (etf_code, stock_code, data_date).
        """
        if df.empty:
            return

        try:
            # POST with merge-duplicates prefer header for upsert
            url = f"{self.supabase_url}/rest/v1/etf_holdings_snapshot"
            headers = self.headers.copy()
            headers["Prefer"] = "resolution=merge-duplicates"
            
            # 2. Insert/Upsert new
            records = []
            for _, row in df.iterrows():
                records.append({
                    "etf_code": etf_code,
                    "stock_code": str(row['code']),
                    "stock_name": row['name'],
                    "shares": int(row['shares']),
                    "weight": float(row['weight']),
                    "data_date": data_date,
                    "price": float(row['price']) if 'price' in df.columns and pd.notnull(row['price']) else None,
                    "amount": float(row['amount']) if 'amount' in df.columns and pd.notnull(row['amount']) else None,
                    "margin_ratio": float(row['margin_ratio']) if 'margin_ratio' in df.columns and pd.notnull(row['margin_ratio']) else 0,
                    "change_percent": float(row['change_percent']) if 'change_percent' in df.columns and pd.notnull(row['change_percent']) else 0,
                    "volatility": float(row['volatility']) if 'volatility' in df.columns and pd.notnull(row['volatility']) else None,
                    "market_cap": float(row['market_cap']) if 'market_cap' in df.columns and pd.notnull(row['market_cap']) else None,
                    "is_high_5d": bool(row['is_high_5d']) if 'is_high_5d' in df.columns and pd.notnull(row['is_high_5d']) else False,
                    "is_high_20d": bool(row['is_high_20d']) if 'is_high_20d' in df.columns and pd.notnull(row['is_high_20d']) else False,
                    "is_high_200d": bool(row['is_high_200d']) if 'is_high_200d' in df.columns and pd.notnull(row['is_high_200d']) else False,
                    "monthly_revenue": float(row['monthly_revenue']) if 'monthly_revenue' in df.columns and pd.notnull(row['monthly_revenue']) else None,
                    "revenue_yoy": float(row['revenue_yoy']) if 'revenue_yoy' in df.columns and pd.notnull(row['revenue_yoy']) else None,
                    "revenue_mom": float(row['revenue_mom']) if 'revenue_mom' in df.columns and pd.notnull(row['revenue_mom']) else None,
                    "revenue_momentum_rank": float(row['revenue_momentum_rank']) if 'revenue_momentum_rank' in df.columns and pd.notnull(row['revenue_momentum_rank']) else None,
                    "currency": row['currency'] if 'currency' in df.columns else 'TWD'
                })
            
            requests.post(f"{self.supabase_url}/rest/v1/etf_holdings_snapshot", headers=headers, json=records).raise_for_status()
            logger.info(f"Successfully saved {len(records)} snapshot records via REST (UPSERT mode).")
        except Exception as e:
            logger.error(f"Failed to save snapshot via REST: {e}")
            raise

    def save_stock_prices(self, df_prices: pd.DataFrame):
        """
        Save OHLCV data using Upsert (POST with Prefer: resolution=merge).
        df_prices columns: [stock_id, date, open, high, low, close, volume]
        """
        if df_prices.empty:
            return

        url = f"{self.supabase_url}/rest/v1/stock_prices_daily"
        headers = self.headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates"

        records = []
        for _, row in df_prices.iterrows():
            records.append({
                "stock_code": str(row['stock_id']),
                "data_date": row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else str(row['date']),
                "open": float(row['open']) if pd.notnull(row['open']) else None,
                "high": float(row['high']) if pd.notnull(row['high']) else None,
                "low": float(row['low']) if pd.notnull(row['low']) else None,
                "close": float(row['close']) if pd.notnull(row['close']) else None,
                "volume": int(row['volume']) if pd.notnull(row['volume']) else 0,
                "amount": float(row['amount']) if 'amount' in row and pd.notnull(row['amount']) else None,
                "margin_ratio": float(row['margin_ratio']) if 'margin_ratio' in row and pd.notnull(row['margin_ratio']) else 0,
                "it_buy": int(row['it_buy']) if 'it_buy' in row and pd.notnull(row['it_buy']) else 0
            })

        # Batch insert to avoid URL length issues
        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            try:
                resp = requests.post(url, headers=headers, json=batch)
                resp.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to save price batch: {e}")
                # Log response text if available for clearer error
                if hasattr(e, 'response') and e.response:
                    logger.error(f"Response: {e.response.text}")
        
        logger.info(f"Successfully synced {len(records)} price records.")

    def save_diff_logs(self, diffs: List[Dict[str, Any]]):
        """
        Save diff events via REST API.
        新版支援 prev_shares / curr_shares / prev_weight / curr_weight / is_significant 欄位。
        """
        if not diffs:
            return

        # 過濾掉 DB schema 不認識的 key（避免 insert 錯誤）
        ALLOWED_KEYS = {
            "etf_code", "data_date", "change_type", "stock_code", "stock_name",
            "diff_shares", "diff_weight", "description",
            "prev_shares", "curr_shares", "prev_weight", "curr_weight", "is_significant",
        }
        safe_diffs = [{k: v for k, v in d.items() if k in ALLOWED_KEYS} for d in diffs]

        try:
            url = f"{self.supabase_url}/rest/v1/etf_diff_logs"
            headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
            requests.post(url, headers=headers, json=safe_diffs).raise_for_status()
            logger.info(f"Saved {len(safe_diffs)} diff logs via REST.")
        except Exception as e:
            logger.error(f"Failed to save diff logs via REST: {e}")
            raise

    def save_weight_history(self, records: List[Dict[str, Any]]):
        """
        Upsert 持股權重走勢記錄至 etf_weight_history 表。
        records 需含欄位：etf_code, stock_code, stock_name, data_date, weight, shares, rank
        """
        if not records:
            return

        url = f"{self.supabase_url}/rest/v1/etf_weight_history"
        headers = self.headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates"

        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                resp = requests.post(url, headers=headers, json=batch)
                resp.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to save weight history batch (offset {i}): {e}")

        logger.info(f"✅ 權重走勢已寫入 {len(records)} 筆")

    def update_holding_periods(self, diffs: List[Dict[str, Any]]):
        """
        Update holding periods via REST API.
        Note: This is a bit more complex via REST without RPC, but we can do it with simple logic.
        """
        if not diffs:
            return

        for d in diffs:
            ctype = d.get('change_type')
            etf = d.get('etf_code')
            code = d.get('stock_code')
            date = d.get('data_date')
            name = d.get('stock_name')
            
            url = f"{self.supabase_url}/rest/v1/etf_holding_periods"
            
            if ctype == 'IN':
                # Close active periods
                requests.patch(url, headers=self.headers, 
                             params={"etf_code": f"eq.{etf}", "stock_code": f"eq.{code}", "is_active": "eq.true"},
                             json={"is_active": False, "end_date": date})
                
                # Insert new
                requests.post(url, headers=self.headers, json={
                    "etf_code": etf,
                    "stock_code": code,
                    "stock_name": name,
                    "start_date": date,
                    "is_active": True
                })
                
            elif ctype == 'OUT':
                # Close periods
                requests.patch(url, headers=self.headers, 
                             params={"etf_code": f"eq.{etf}", "stock_code": f"eq.{code}", "is_active": "eq.true"},
                             json={"is_active": False, "end_date": date})
    def save_company_info(self, df_info: pd.DataFrame):
        """
        Save company basic info (industry, full name) via REST API UPSERT.
        """
        if df_info.empty:
            return

        url = f"{self.supabase_url}/rest/v1/stock_basic_info"
        headers = self.headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates"

        records = []
        for _, row in df_info.iterrows():
            records.append({
                "stock_code": str(row['stock_code']),
                "name_short": row['name_short'],
                "name_full": row['name_full'],
                "industry": row['industry'],
                "updated_at": datetime.now().isoformat()
            })

        try:
            resp = requests.post(url, headers=headers, json=records)
            resp.raise_for_status()
            logger.info(f"Successfully synced {len(records)} company info records.")
        except Exception as e:
            logger.error(f"Failed to save company info: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")

from datetime import datetime
