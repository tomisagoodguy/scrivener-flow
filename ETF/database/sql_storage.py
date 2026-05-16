
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
            
        self.engine = sqlalchemy.create_engine(
            self.db_url,
            connect_args={"client_encoding": "utf8"},
        )
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

    def get_all_target_stocks(self) -> list:
        """從 etf_holdings_snapshot 取得所有 ETF 的成分股（去重合集）"""
        with self.engine.connect() as conn:
            query = text("""
                SELECT DISTINCT stock_code
                FROM etf_holdings_snapshot
                ORDER BY stock_code
            """)
            result = conn.execute(query)
            return [row[0] for row in result]

    def save_diff_logs(self, diff_logs: list):
        """Upsert diff logs 到 etf_diff_logs 表（SQLAlchemy，避免 REST API 409）。"""
        if not diff_logs:
            return

        upsert_sql = text("""
            INSERT INTO etf_diff_logs
                (etf_code, stock_code, stock_name, data_date, change_type,
                 prev_shares, curr_shares, diff_shares,
                 prev_weight, curr_weight, diff_weight,
                 is_significant, description)
            VALUES
                (:etf_code, :stock_code, :stock_name, :data_date, :change_type,
                 :prev_shares, :curr_shares, :diff_shares,
                 :prev_weight, :curr_weight, :diff_weight,
                 :is_significant, :description)
            ON CONFLICT (etf_code, stock_code, data_date)
            DO UPDATE SET
                change_type    = EXCLUDED.change_type,
                stock_name     = EXCLUDED.stock_name,
                prev_shares    = EXCLUDED.prev_shares,
                curr_shares    = EXCLUDED.curr_shares,
                diff_shares    = EXCLUDED.diff_shares,
                prev_weight    = EXCLUDED.prev_weight,
                curr_weight    = EXCLUDED.curr_weight,
                diff_weight    = EXCLUDED.diff_weight,
                is_significant = EXCLUDED.is_significant,
                description    = EXCLUDED.description
        """)

        with self.engine.connect() as conn:
            conn.execute(upsert_sql, diff_logs)
            conn.commit()
        logger.info(f"Saved {len(diff_logs)} diff logs via SQLAlchemy.")

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
            chunk_size = 500
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
                    conn.rollback()
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

                # 6. ETF 新聞（只保留 5 天）
                sql_news = text("DELETE FROM etf_news WHERE pub_date < CURRENT_DATE - INTERVAL '5 days'")
                res_news = conn.execute(sql_news)

                conn.commit()
                logger.info(f"✅ 自動優化完成！")
                logger.info(f"   - 每日股價已清理: {res_prices.rowcount} 筆")
                logger.info(f"   - 持股快照已清理: {res_snapshot.rowcount} 筆")
                logger.info(f"   - 券商交易已清理: {res_broker.rowcount} 筆")
                logger.info(f"   - 集保數據已清理: {res_chips.rowcount} 筆")
                logger.info(f"   - 營收數據已清理: {res_revenue.rowcount} 筆")
                logger.info(f"   - ETF 新聞已清理: {res_news.rowcount} 筆")

        except Exception as e:
            logger.error(f"自動優化失敗: {e}")

    
    def upsert_etf_news(self, etf_code: str, news_list: list) -> int:
        """將 MOPS 公告列表 upsert 進 etf_news，重複筆數靜默跳過。"""
        if not news_list:
            return 0
        records = [
            {
                "etf_code": etf_code,
                "stock_code": item["stock_code"],
                "pub_date": item["pub_date"],
                "pub_time": item.get("pub_time"),
                "title": item["title"],
                "source": item.get("source", "公開資訊觀測站"),
                "url": item.get("url"),
            }
            for item in news_list
        ]
        try:
            with self.engine.connect() as conn:
                before = conn.execute(text("SELECT COUNT(*) FROM etf_news")).scalar()
                for rec in records:
                    conn.execute(
                        text("""
                            INSERT INTO etf_news (etf_code, stock_code, pub_date, pub_time, title, source, url)
                            VALUES (:etf_code, :stock_code, :pub_date, :pub_time, :title, :source, :url)
                            ON CONFLICT (etf_code, stock_code, pub_date, title) DO NOTHING
                        """),
                        rec,
                    )
                conn.commit()
                after = conn.execute(text("SELECT COUNT(*) FROM etf_news")).scalar()
                return (after or 0) - (before or 0)
        except Exception as e:
            logger.error(f"upsert_etf_news 失敗: {e}")
            return 0

    def upsert_strategy_signals(self, records: list) -> None:
        """Upsert strategy signal rows into strategy_signals table.

        Args:
            records: list of dicts with keys:
                strategy_id, date, stock_id, score, is_selected, conditions
        """
        if not records:
            return
        logger.info(f"準備寫入 {len(records)} 筆策略訊號...")
        with self.engine.connect() as conn:
            chunk_size = 500
            for i in range(0, len(records), chunk_size):
                chunk = records[i : i + chunk_size]
                conn.execute(
                    text("""
                        INSERT INTO strategy_signals
                            (strategy_id, date, stock_id, score, is_selected, conditions)
                        VALUES
                            (:strategy_id, :date, :stock_id, :score, :is_selected, CAST(:conditions AS jsonb))
                        ON CONFLICT (strategy_id, date, stock_id)
                        DO UPDATE SET
                            score = EXCLUDED.score,
                            is_selected = EXCLUDED.is_selected,
                            conditions = EXCLUDED.conditions
                    """),
                    chunk,
                )
                conn.commit()
        logger.info("✅ 策略訊號寫入完成")

    def _get_stock_name(self, stock_code: str) -> str:
        """從 stock_basic_info 取得股票名稱"""
        try:
            with self.engine.connect() as conn:
                query = text("SELECT name_short FROM stock_basic_info WHERE stock_code = :code")
                result = conn.execute(query, {'code': stock_code}).fetchone()
                return result[0] if result else stock_code
        except Exception:
            return stock_code


