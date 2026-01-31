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
            "select": "stock_code,stock_name,shares,weight,data_date"
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
                    "data_date": data_date
                })
            
            requests.post(f"{self.supabase_url}/rest/v1/etf_holdings_snapshot", headers=self.headers, json=records).raise_for_status()
            logger.info(f"Successfully saved {len(records)} snapshot records via REST.")
        except Exception as e:
            logger.error(f"Failed to save snapshot via REST: {e}")
            raise

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
