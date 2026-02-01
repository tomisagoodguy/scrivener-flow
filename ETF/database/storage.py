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

    def get_latest_snapshot(self, etf_code: str) -> pd.DataFrame:
        """
        Get the current snapshot from Supabase REST API.
        """
        url = f"{self.supabase_url}/rest/v1/etf_holdings_snapshot"
        params = {
            "etf_code": f"eq.{etf_code}",
            "select": "stock_code,stock_name,shares,weight,data_date,price,currency,amount,margin_ratio,change_percent,volatility,market_cap,is_high_5d,is_high_20d,is_high_200d,monthly_revenue,revenue_yoy,revenue_mom,revenue_momentum_rank"
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data:
                return pd.DataFrame()
                
            df = pd.DataFrame(data)
            # Rename columns to match what the processor expects
            df = df.rename(columns={
                "stock_code": "code",
                "stock_name": "name"
            })
            df['shares'] = df['shares'].astype(int)
            df['weight'] = df['weight'].astype(float)
            if 'price' in df.columns:
                df['price'] = pd.to_numeric(df['price'], errors='coerce')
            return df
        except Exception as e:
            logger.error(f"Error fetching snapshot via REST: {e}")
            return pd.DataFrame()

    def save_snapshot(self, df: pd.DataFrame, etf_code: str, data_date: str):
        """
        Overwrite snapshot via REST API (Delete then Upsert).
        """
        if df.empty:
            return

        # 1. Delete old
        delete_url = f"{self.supabase_url}/rest/v1/etf_holdings_snapshot"
        try:
            requests.delete(delete_url, headers=self.headers, params={"etf_code": f"eq.{etf_code}"})
            
            # 2. Insert new
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
            
            requests.post(f"{self.supabase_url}/rest/v1/etf_holdings_snapshot", headers=self.headers, json=records).raise_for_status()
            logger.info(f"Successfully saved {len(records)} snapshot records via REST.")
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
                "margin_ratio": float(row['margin_ratio']) if 'margin_ratio' in row and pd.notnull(row['margin_ratio']) else 0
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
        """
        if not diffs:
            return
        
        try:
            url = f"{self.supabase_url}/rest/v1/etf_diff_logs"
            requests.post(url, headers=self.headers, json=diffs).raise_for_status()
            logger.info(f"Saved {len(diffs)} diff logs via REST.")
        except Exception as e:
            logger.error(f"Failed to save diff logs via REST: {e}")
            raise

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
