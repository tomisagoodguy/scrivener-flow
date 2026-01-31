import logging
import pandas as pd
import sqlalchemy
from sqlalchemy import text
from typing import List, Dict, Any, Optional
from .connection import get_db_engine

logger = logging.getLogger(__name__)

class ETFStorage:
    def __init__(self):
        self.engine = get_db_engine()

    def get_latest_snapshot(self, etf_code: str) -> pd.DataFrame:
        """
        Get the current snapshot from DB to compare with new data.
        """
        query = text("""
            SELECT stock_code as code, stock_name as name, shares, weight, data_date
            FROM public.etf_holdings_snapshot
            WHERE etf_code = :etf_code
        """)
        
        try:
            df = pd.read_sql(query, self.engine, params={"etf_code": etf_code})
            if not df.empty:
                # Ensure data types for comparison
                df['shares'] = df['shares'].astype(int)
                df['weight'] = df['weight'].astype(float)
            return df
        except Exception as e:
            logger.error(f"Error fetching snapshot: {e}")
            return pd.DataFrame()

    def save_snapshot(self, df: pd.DataFrame, etf_code: str, data_date: str):
        """
        Overwrite snapshot with new data.
        Transactional: Delete old for this ETF -> Insert new.
        """
        if df.empty:
            return

        # Prepare records
        records = df.copy()
        records['etf_code'] = etf_code
        records['data_date'] = data_date
        records['stock_code'] = records['code'] # map back
        records['stock_name'] = records['name']
        
        # Keep only table columns
        cols = ['etf_code', 'stock_code', 'stock_name', 'shares', 'weight', 'data_date']
        records = records[cols]

        try:
            with self.engine.begin() as conn:
                # 1. Delete existing snapshot for this ETF
                conn.execute(
                    text("DELETE FROM public.etf_holdings_snapshot WHERE etf_code = :etf_code"),
                    {"etf_code": etf_code}
                )
                
                # 2. Insert new
                records.to_sql(
                    'etf_holdings_snapshot', 
                    conn, 
                    if_exists='append', 
                    index=False,
                    schema='public'
                )
            logger.info(f"Snapshot updated for {etf_code} on {data_date}")
        except Exception as e:
            logger.error(f"Failed to save snapshot: {e}")
            raise

    def save_diff_logs(self, diffs: List[Dict[str, Any]]):
        """
        Save diff events to etf_diff_logs
        """
        if not diffs:
            return

        df = pd.DataFrame(diffs)
        # Ensure columns match DB
        # required: etf_code, data_date, change_type, stock_code, stock_name, diff_shares, diff_weight, description
        
        try:
            df.to_sql(
                'etf_diff_logs',
                self.engine,
                if_exists='append',
                index=False,
                schema='public'
            )
            logger.info(f"Saved {len(df)} diff logs.")
        except Exception as e:
            logger.error(f"Failed to save diff logs: {e}")
            raise

    def update_holding_periods(self, diffs: List[Dict[str, Any]]):
        """
        Update etf_holding_periods based on IN/OUT events.
        """
        if not diffs:
            return

        with self.engine.begin() as conn:
            for d in diffs:
                ctype = d.get('change_type')
                etf = d.get('etf_code')
                code = d.get('stock_code')
                date = d.get('data_date')
                name = d.get('stock_name')
                
                if ctype == 'IN':
                    # Close any previous active period just in case (sanity check)
                    conn.execute(
                        text("""
                        UPDATE public.etf_holding_periods 
                        SET is_active = false, end_date = :date 
                        WHERE etf_code = :etf AND stock_code = :code AND is_active = true
                        """),
                        {"date": date, "etf": etf, "code": code}
                    )
                    
                    # Insert new active period
                    conn.execute(
                        text("""
                        INSERT INTO public.etf_holding_periods (etf_code, stock_code, stock_name, start_date, is_active)
                        VALUES (:etf, :code, :name, :date, true)
                        """),
                        {"etf": etf, "code": code, "name": name, "date": date}
                    )
                    
                elif ctype == 'OUT':
                    # Close period
                    conn.execute(
                        text("""
                        UPDATE public.etf_holding_periods 
                        SET is_active = false, end_date = :date 
                        WHERE etf_code = :etf AND stock_code = :code AND is_active = true
                        """),
                        {"date": date, "etf": etf, "code": code}
                    )
