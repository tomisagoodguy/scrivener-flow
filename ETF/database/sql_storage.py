
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
        
        # Try to use full DB URL first (Best for GitHub Actions / Production)
        full_url = os.getenv("SUPABASE_DB_URL")
        if full_url:
            self.db_url = full_url
        else:
            # Fallback to constructing it (Old way)
            supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            if not supabase_url:
                raise ValueError("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_URL not found")
            
            project_ref = supabase_url.split("//")[1].split(".")[0]
            db_password = os.getenv("SUPABASE_DB_PASSWORD")
            if not db_password:
                raise ValueError("SUPABASE_DB_PASSWORD not found")
            
            self.db_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
            
        self.engine = sqlalchemy.create_engine(self.db_url)
        self._ensure_tables()

    def _ensure_tables(self):
        """確保所有必要的資料表都已建立"""
        with self.engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS stock_basic_info (
                    stock_code TEXT PRIMARY KEY,
                    name_short TEXT,
                    name_full TEXT,
                    industry TEXT,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """))
            conn.commit()

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
            chunk_size = 500
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
            chunk_size = 500
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
    
    def cleanup_old_data(self):
        """清除過舊資料以節省 Supabase 空間 (只保留約 260 天)"""
        logger.info("開始執行數據庫容量自動優化 (Retention: ~260 days)...")
        try:
            with self.engine.connect() as conn:
                # 1. 每日股價 (佔最大空間)
                sql_prices = text("DELETE FROM stock_prices_daily WHERE data_date < CURRENT_DATE - INTERVAL '260 days'")
                res_prices = conn.execute(sql_prices)

                # 2. 持股快照
                sql_snapshot = text("DELETE FROM etf_holdings_snapshot WHERE data_date < CURRENT_DATE - INTERVAL '260 days'")
                res_snapshot = conn.execute(sql_snapshot)
                
                # 3. 券商分點
                sql_broker = text("DELETE FROM stock_broker_transactions WHERE data_date < CURRENT_DATE - INTERVAL '260 days'")
                res_broker = conn.execute(sql_broker)
                
                # 4. 集保數據 (週資料，可保留稍長一點，但統一策略也好)
                sql_chips = text("DELETE FROM stock_shareholder_weekly WHERE data_date < CURRENT_DATE - INTERVAL '365 days'")
                res_chips = conn.execute(sql_chips)

                # 5. 營收數據 (月資料)
                sql_revenue = text("DELETE FROM stock_revenue_monthly WHERE data_date < CURRENT_DATE - INTERVAL '730 days'") # 營收年增率需要比較久，保留2年
                res_revenue = conn.execute(sql_revenue)
                
                conn.commit()
                logger.info(f"✅ 自動優化完成！")
                logger.info(f"   - 每日股價已清理: {res_prices.rowcount} 筆")
                logger.info(f"   - 持股快照已清理: {res_snapshot.rowcount} 筆")
                logger.info(f"   - 券商交易已清理: {res_broker.rowcount} 筆")
                logger.info(f"   - 集保數據已清理: {res_chips.rowcount} 筆")
                logger.info(f"   - 營收數據已清理: {res_revenue.rowcount} 筆")

        except Exception as e:
            logger.error(f"自動優化失敗: {e}")

    # ===== 量化策略相關方法 =====
    
    def upsert_strategy_holdings(self, strategy_code: str, data_date: str, holdings_df: pd.DataFrame):
        """
        批次寫入策略持股結果，並自動清理 3 個月前的舊資料
        
        Args:
            strategy_code: 策略代碼 (e.g., 'low_vol_alpha_yoy')
            data_date: 資料日期 (YYYY-MM-DD)
            holdings_df: 持股 DataFrame，必須包含欄位:
                - stock_code
                - rank_position
                - close_price
                - revenue_yoy
                - revenue_mom
                - amount
                - natr
                - rs_rank
                - price_to_high_pct
        """
        if holdings_df.empty:
            logger.warning("持股資料為空，跳過寫入")
            return
        
        records = holdings_df.to_dict('records')
        for record in records:
            record['strategy_code'] = strategy_code
            record['data_date'] = data_date
        
        logger.info(f"準備寫入 {len(records)} 筆策略持股記錄...")
        
        with self.engine.connect() as conn:
            # Step 1: 寫入或更新持股記錄
            stmt = text("""
                INSERT INTO strategy_daily_holdings 
                (strategy_code, data_date, stock_code, rank_position, 
                 close_price, revenue_yoy, revenue_mom, amount, natr, rs_rank, price_to_high_pct)
                VALUES (:strategy_code, :data_date, :stock_code, :rank_position,
                        :close_price, :revenue_yoy, :revenue_mom, :amount, :natr, :rs_rank, :price_to_high_pct)
                ON CONFLICT (strategy_code, data_date, stock_code)
                DO UPDATE SET
                    rank_position = EXCLUDED.rank_position,
                    close_price = EXCLUDED.close_price,
                    revenue_yoy = EXCLUDED.revenue_yoy,
                    revenue_mom = EXCLUDED.revenue_mom,
                    amount = EXCLUDED.amount,
                    natr = EXCLUDED.natr,
                    rs_rank = EXCLUDED.rs_rank,
                    price_to_high_pct = EXCLUDED.price_to_high_pct,
                    created_at = NOW()
            """)
            conn.execute(stmt, records)
            
            # Step 2: 清理 3 個月前的舊資料（月度策略只保留近期資料）
            cleanup_stmt = text("""
                DELETE FROM strategy_daily_holdings
                WHERE strategy_code = :strategy_code
                  AND data_date < (DATE(:current_date) - INTERVAL '3 months')
            """)
            cleanup_result = conn.execute(cleanup_stmt, {
                'strategy_code': strategy_code,
                'current_date': data_date
            })
            
            conn.commit()
        
        logger.info(f"✅ 已寫入 {len(records)} 筆策略持股記錄")
        if cleanup_result.rowcount > 0:
            logger.info(f"🧹 已清理 {cleanup_result.rowcount} 筆 3 個月前的舊資料")
    
    def detect_strategy_changes(self, strategy_code: str, current_date: str) -> list:
        """
        檢測持股異動 (IN/OUT/HOLD)
        
        Args:
            strategy_code: 策略代碼
            current_date: 當前日期 (YYYY-MM-DD)
            
        Returns:
            list: 異動記錄列表，每筆包含:
                - strategy_code
                - data_date
                - change_type: 'IN', 'OUT', 'HOLD'
                - stock_code
                - stock_name (從 stock_basic_info 取得)
                - prev_rank (若為 IN 則為 None)
                - new_rank (若為 OUT 則為 None)
        """
        with self.engine.connect() as conn:
            # 取得前一交易日持股
            prev_holdings_query = text("""
                SELECT stock_code, rank_position 
                FROM strategy_daily_holdings
                WHERE strategy_code = :strategy_code 
                  AND data_date < :current_date
                ORDER BY data_date DESC
                LIMIT 10
            """)
            prev_holdings = conn.execute(
                prev_holdings_query, 
                {'strategy_code': strategy_code, 'current_date': current_date}
            ).fetchall()
            
            # 取得當日持股
            curr_holdings_query = text("""
                SELECT stock_code, rank_position
                FROM strategy_daily_holdings
                WHERE strategy_code = :strategy_code AND data_date = :current_date
            """)
            curr_holdings = conn.execute(
                curr_holdings_query, 
                {'strategy_code': strategy_code, 'current_date': current_date}
            ).fetchall()
        
        prev_stocks = {row[0]: row[1] for row in prev_holdings}
        curr_stocks = {row[0]: row[1] for row in curr_holdings}
        
        changes = []
        
        # IN: 新加入
        for stock_code in curr_stocks:
            if stock_code not in prev_stocks:
                stock_name = self._get_stock_name(stock_code)
                changes.append({
                    'strategy_code': strategy_code,
                    'data_date': current_date,
                    'change_type': 'IN',
                    'stock_code': stock_code,
                    'stock_name': stock_name,
                    'prev_rank': None,
                    'new_rank': curr_stocks[stock_code]
                })
        
        # OUT: 移除
        for stock_code in prev_stocks:
            if stock_code not in curr_stocks:
                stock_name = self._get_stock_name(stock_code)
                changes.append({
                    'strategy_code': strategy_code,
                    'data_date': current_date,
                    'change_type': 'OUT',
                    'stock_code': stock_code,
                    'stock_name': stock_name,
                    'prev_rank': prev_stocks[stock_code],
                    'new_rank': None
                })
        
        return changes
    
    def log_strategy_changes(self, changes: list):
        """
        批次寫入策略異動記錄，並自動清理 3 個月前的舊記錄
        
        Args:
            changes: 異動記錄列表
        """
        if not changes:
            return
        
        logger.info(f"準備寫入 {len(changes)} 筆策略異動記錄...")
        
        # 取得當前日期與策略代碼
        current_date = changes[0]['data_date']
        strategy_code = changes[0]['strategy_code']
        
        with self.engine.connect() as conn:
            # Step 0: 移除當日已存在的異動記錄 (避免重複跑腳本導致重複資料)
            delete_stmt = text("""
                DELETE FROM strategy_changes_log 
                WHERE strategy_code = :strategy_code 
                  AND data_date = :data_date
            """)
            conn.execute(delete_stmt, {
                'strategy_code': strategy_code, 
                'data_date': current_date
            })
            
            # Step 1: 寫入異動記錄
            stmt = text("""
                INSERT INTO strategy_changes_log 
                (strategy_code, data_date, change_type, stock_code, stock_name, prev_rank, new_rank)
                VALUES (:strategy_code, :data_date, :change_type, :stock_code, :stock_name, :prev_rank, :new_rank)
            """)
            conn.execute(stmt, changes)
            
            # Step 2: 清理 3 個月前的舊異動記錄
            cleanup_stmt = text("""
                DELETE FROM strategy_changes_log
                WHERE strategy_code = :strategy_code
                  AND data_date < (DATE(:current_date) - INTERVAL '3 months')
            """)
            cleanup_result = conn.execute(cleanup_stmt, {
                'strategy_code': strategy_code,
                'current_date': current_date
            })
            
            conn.commit()
        
        logger.info(f"✅ 已寫入 {len(changes)} 筆策略異動記錄 (已覆蓋舊資料)")
        if cleanup_result.rowcount > 0:
            logger.info(f"🧹 已清理 {cleanup_result.rowcount} 筆 3 個月前的異動記錄")
    
    def _get_stock_name(self, stock_code: str) -> str:
        """從 stock_basic_info 取得股票名稱"""
        try:
            with self.engine.connect() as conn:
                query = text("SELECT name_short FROM stock_basic_info WHERE stock_code = :code")
                result = conn.execute(query, {'code': stock_code}).fetchone()
                return result[0] if result else stock_code
        except Exception:
            return stock_code

