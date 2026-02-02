
import os
import logging
import pandas as pd
import sqlalchemy
from sqlalchemy import text
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class SQLStorage:
    def __init__(self):
        # Load env
        load_dotenv('.env.local')
        
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        if not supabase_url:
            raise ValueError("NEXT_PUBLIC_SUPABASE_URL not found")
        
        project_ref = supabase_url.split("//")[1].split(".")[0]
        db_password = os.getenv("SUPABASE_DB_PASSWORD")
        if not db_password:
            raise ValueError("SUPABASE_DB_PASSWORD not found")
        
        self.db_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
        self.engine = sqlalchemy.create_engine(self.db_url)

    def get_target_stocks(self, etf_code: str) -> list:
        """從 etf_holdings_snapshot 取得目標股票清單"""
        with self.engine.connect() as conn:
            query = text("""
                SELECT DISTINCT stock_code 
                FROM etf_holdings_snapshot 
                WHERE etf_code = :etf_code
                ORDER BY stock_code
            """)
            result = conn.execute(query, {"etf_code": etf_code})
            return [row[0] for row in result]

    def upsert_revenue_data(self, records: list):
        """批次更新營收數據 (Bulk)"""
        if not records:
            return
            
        logger.info(f"準備寫入 {len(records)} 筆營收記錄...")
        
        with self.engine.connect() as conn:
            chunk_size = 2000
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i+chunk_size]
                upsert_sql = text("""
                    INSERT INTO stock_revenue_monthly (stock_code, data_date, revenue, revenue_yoy, revenue_mom)
                    VALUES (:stock_code, :data_date, :revenue, :revenue_yoy, :revenue_mom)
                    ON CONFLICT (stock_code, data_date) 
                    DO UPDATE SET 
                        revenue = EXCLUDED.revenue,
                        revenue_yoy = EXCLUDED.revenue_yoy,
                        revenue_mom = EXCLUDED.revenue_mom,
                        created_at = NOW()
                """)
                conn.execute(upsert_sql, chunk)
                conn.commit()
        logger.info("✅ 營收數據寫入完成")

    def upsert_shareholder_data(self, records: list):
        """批次更新集保數據 (Bulk)"""
        if not records:
            return

        logger.info(f"準備寫入 {len(records)} 筆集保記錄...")
        with self.engine.connect() as conn:
            chunk_size = 2000
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i+chunk_size]
                upsert_sql = text("""
                    INSERT INTO stock_shareholder_weekly 
                    (stock_code, data_date, shareholder_tier, holder_count, shares_held, custody_ratio)
                    VALUES (:stock_code, :data_date, :shareholder_tier, :holder_count, :shares_held, :custody_ratio)
                    ON CONFLICT (stock_code, data_date, shareholder_tier) 
                    DO UPDATE SET 
                        holder_count = EXCLUDED.holder_count,
                        shares_held = EXCLUDED.shares_held,
                        custody_ratio = EXCLUDED.custody_ratio,
                        created_at = NOW()
                """)
                conn.execute(upsert_sql, chunk)
                conn.commit()
        logger.info("✅ 集保數據寫入完成")

    def upsert_broker_transactions(self, records: list):
        """批次更新券商買賣超數據"""
        if not records:
            return

        logger.info(f"準備寫入 {len(records)} 筆券商交易記錄...")
        with self.engine.connect() as conn:
            chunk_size = 50
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i+chunk_size]
                try:
                    stmt = text("""
                        INSERT INTO stock_broker_transactions 
                        (stock_code, data_date, buy_amount, sell_amount, net_volume, force_metric)
                        VALUES (:stock_code, :data_date, :buy_amount, :sell_amount, :net_volume, :force_metric)
                        ON CONFLICT (stock_code, data_date) 
                        DO UPDATE SET 
                            buy_amount = EXCLUDED.buy_amount,
                            sell_amount = EXCLUDED.sell_amount,
                            net_volume = EXCLUDED.net_volume,
                            force_metric = EXCLUDED.force_metric,
                            created_at = NOW()
                    """)
                    conn.execute(stmt, chunk)
                    conn.commit()
                    logger.info(f"已寫入 {i + len(chunk)} / {len(records)} 筆券商記錄...")
                except Exception as e:
                    logger.error(f"寫入券商數據片段失敗 (index {i}): {e}")
                    conn.rollback() # Ensure rollback on error
                    continue
        logger.info("✅ 券商交易數據寫入完成")
    
    def cleanup_old_data(self, retention_days: int = 730):
        """清除過舊資料"""
        logger.info(f"清除 {retention_days} 天前的過舊資料...")
        try:
            with self.engine.connect() as conn:
                sql_broker = text(f"DELETE FROM stock_broker_transactions WHERE data_date < NOW() - INTERVAL '{retention_days} days'")
                res_broker = conn.execute(sql_broker)
                
                sql_chips = text(f"DELETE FROM stock_shareholder_weekly WHERE data_date < NOW() - INTERVAL '{retention_days} days'")
                res_chips = conn.execute(sql_chips)
                
                conn.commit()
                logger.info(f"✅ 清除完成: 券商數據 {res_broker.rowcount} 筆, 集保數據 {res_chips.rowcount} 筆")
        except Exception as e:
            logger.error(f"清除舊資料失敗: {e}")
