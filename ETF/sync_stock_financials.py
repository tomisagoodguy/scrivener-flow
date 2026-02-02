"""
Investment Dashboard Enhancement - Stock Financials Sync
同步個股營收與股權分散數據到 Supabase

資料範圍：
- 營收：近 24 個月
- 集保（股權分散）：近 48 週
"""
import os
import sys
import logging
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

# Add ETF directory to path for imports
ETF_DIR = Path(__file__).parent
sys.path.insert(0, str(ETF_DIR))

from services.finlab_service import FinlabService

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load .env.local from project root
project_root = ETF_DIR.parent
env_path = project_root / '.env.local'
load_dotenv(env_path)

class FinancialsSync:
    def __init__(self):
        self.finlab = FinlabService()
        
        # Database connection
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        if not supabase_url:
            raise ValueError("NEXT_PUBLIC_SUPABASE_URL not found")
        
        project_ref = supabase_url.split("//")[1].split(".")[0]
        db_password = os.getenv("SUPABASE_DB_PASSWORD")
        if not db_password:
            raise ValueError("SUPABASE_DB_PASSWORD not found")
        
        self.db_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
        self.engine = sqlalchemy.create_engine(self.db_url)
    
    def get_target_stocks(self) -> list:
        """從 etf_holdings_snapshot 取得目標股票清單"""
        logger.info("正在獲取目標股票清單...")
        
        with self.engine.connect() as conn:
            query = text("""
                SELECT DISTINCT stock_code 
                FROM etf_holdings_snapshot 
                WHERE etf_code = '00981A'
                ORDER BY stock_code
            """)
            result = conn.execute(query)
            stocks = [row[0] for row in result]
        
        logger.info(f"找到 {len(stocks)} 支成分股")
        return stocks
    
    def sync_revenue_data(self, stock_list: list):
        """同步月營收數據（近24個月）"""
        logger.info("開始同步月營收數據...")
        
        if not self.finlab.login():
            logger.error("Finlab 登入失敗")
            return
        
        # 取得營收數據
        revenue_df = self.finlab._get_data('monthly_revenue')
        revenue_yoy_df = self.finlab._get_data('monthly_revenue_yoy')
        revenue_mom_df = self.finlab._get_data('revenue_mom')
        
        if revenue_df.empty:
            logger.warning("無營收數據")
            return
        
        # 只保留目標股票
        valid_stocks = [s for s in stock_list if s in revenue_df.columns]
        
        # 取近24個月
        revenue_df = revenue_df[valid_stocks].tail(24)
        revenue_yoy_df = revenue_yoy_df[valid_stocks].tail(24) if not revenue_yoy_df.empty else pd.DataFrame()
        revenue_mom_df = revenue_mom_df[valid_stocks].tail(24) if not revenue_mom_df.empty else pd.DataFrame()
        
        # 轉換為 long format
        records = []
        for date in revenue_df.index:
            for stock in valid_stocks:
                rev = revenue_df.loc[date, stock] if stock in revenue_df.columns else None
                yoy = revenue_yoy_df.loc[date, stock] if not revenue_yoy_df.empty and stock in revenue_yoy_df.columns else None
                mom = revenue_mom_df.loc[date, stock] if not revenue_mom_df.empty and stock in revenue_mom_df.columns else None
                
                if pd.notna(rev):
                    records.append({
                        'stock_code': stock,
                        'data_date': date.strftime('%Y-%m-%d'),
                        'revenue': float(rev),
                        'revenue_yoy': float(yoy) if pd.notna(yoy) else None,
                        'revenue_mom': float(mom) if pd.notna(mom) else None
                    })
        
        if not records:
            logger.warning("無有效營收記錄")
            return
        
        # Upsert to database
        logger.info(f"準備寫入 {len(records)} 筆營收記錄...")
        df_to_insert = pd.DataFrame(records)
        
        with self.engine.connect() as conn:
            # 使用 ON CONFLICT 進行 upsert
            for _, row in df_to_insert.iterrows():
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
                conn.execute(upsert_sql, row.to_dict())
            
            conn.commit()
        
        logger.info(f"✅ 營收數據同步完成，共 {len(records)} 筆")
    
    def sync_shareholder_data(self, stock_list: list):
        """同步股權分散數據（近48週）"""
        logger.info("開始同步股權分散數據...")
        
        if not self.finlab.login():
            logger.error("Finlab 登入失敗")
            return
        
        try:
            # 使用 finlab_service 的邏輯
            from finlab import data
            inv = data.get('inventory')
            
            if inv.empty:
                logger.warning("無集保資料")
                return
            
            # 轉換為 DataFrame
            inv_df = inv.reset_index()
            inv_df = inv_df[inv_df['stock_id'].isin(stock_list)]
            
            if inv_df.empty:
                logger.warning("目標股票無集保資料")
                return
            
            # 取近48週
            inv_df['date'] = pd.to_datetime(inv_df['date'])
            recent_dates = sorted(inv_df['date'].unique())[-48:]
            inv_df = inv_df[inv_df['date'].isin(recent_dates)]
            
            # 準備寫入記錄
            records = []
            for _, row in inv_df.iterrows():
                records.append({
                    'stock_code': row['stock_id'],
                    'data_date': row['date'].strftime('%Y-%m-%d'),
                    'shareholder_tier': int(row['持股分級']),
                    'holder_count': int(row['人數']) if pd.notna(row['人數']) else None,
                    'shares_held': float(row['持有股數']) if pd.notna(row['持有股數']) else None,
                    'custody_ratio': float(row['占集保庫存數比例']) if pd.notna(row['占集保庫存數比例']) else None
                })
            
            if not records:
                logger.warning("無有效集保記錄")
                return
            
            logger.info(f"準備寫入 {len(records)} 筆集保記錄...")
            
            with self.engine.connect() as conn:
                for record in records:
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
                    conn.execute(upsert_sql, record)
                
                conn.commit()
            
            logger.info(f"✅ 股權分散數據同步完成，共 {len(records)} 筆")
            
        except Exception as e:
            logger.error(f"同步股權分散數據時出錯: {e}", exc_info=True)

    def sync_broker_transactions(self, stock_list: list):
        """同步券商分點買賣超前15大數據"""
        logger.info("開始同步券商交易數據...")
        
        if not self.finlab.login():
            logger.error("Finlab 登入失敗")
            return
            
        try:
            # 獲取 Top 15 買賣超數據
            buy_vol = self.finlab._get_data('top15_buy')
            sell_vol = self.finlab._get_data('top15_sell')
            close = self.finlab._get_data('close')
            
            if buy_vol.empty or sell_vol.empty:
                logger.warning("無券商 Top 15 交易數據")
                return

            # 只保留目標股票
            buy_vol = buy_vol[buy_vol.columns.intersection(stock_list)]
            sell_vol = sell_vol[sell_vol.columns.intersection(stock_list)]
            
            if buy_vol.empty:
                logger.warning("目標股票無券商數據")
                return
            
            # 對齊日期 (取近 600 天以計算 MA60/SD60)
            all_dates = buy_vol.index.intersection(sell_vol.index)
            if not close.empty:
                all_dates = all_dates.intersection(close.index)
            
            target_dates = all_dates[-600:]
            
            buy_vol = buy_vol.loc[target_dates]
            sell_vol = sell_vol.loc[target_dates]
            close = close.loc[target_dates] if not close.empty else pd.DataFrame(1, index=target_dates, columns=buy_vol.columns)
            
            # 填補缺失值以避免計算錯誤
            buy_vol = buy_vol.fillna(0)
            sell_vol = sell_vol.fillna(0)
            
            # 計算指標
            # net_volume = (buy_vol - sell_vol) * close
            net_vol_raw = buy_vol - sell_vol
            net_volume = net_vol_raw * close
            
            # Force Indicator: net_volume.rolling(60).mean() / net_volume.rolling(60).std()
            force = net_volume.rolling(60).mean() / net_volume.rolling(60).std()
            
            # 轉換為 long format
            buy_s = buy_vol.stack().rename('buy_amount')
            sell_s = sell_vol.stack().rename('sell_amount')
            net_vol_s = net_volume.stack().rename('net_volume')
            force_s = force.stack().rename('force_metric')
            
            merged = pd.concat([buy_s, sell_s, net_vol_s, force_s], axis=1)
            
            records = []
            for (date, stock), row in merged.iterrows():
                # 跳過完全無數據的日子 (buy=0, sell=0 且無 force)
                if row['buy_amount'] == 0 and row['sell_amount'] == 0 and pd.isna(row['force_metric']):
                    continue
                    
                records.append({
                    'stock_code': stock,
                    'data_date': date.strftime('%Y-%m-%d'),
                    'buy_amount': float(row['buy_amount']),
                    'sell_amount': float(row['sell_amount']),
                    'net_volume': float(row['net_volume']),
                    'force_metric': float(row['force_metric']) if pd.notna(row['force_metric']) else None
                })
            
            if not records:
                logger.warning("無有效券商交易記錄")
                return
            
            # 批次寫入
            logger.info(f"準備寫入 {len(records)} 筆券商交易記錄...")
            with self.engine.connect() as conn:
                chunk_size = 1000
                for i in range(0, len(records), chunk_size):
                    chunk = records[i:i+chunk_size]
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
            
            logger.info("✅ 券商交易數據同步完成")
            
        except Exception as e:
            logger.error(f"同步券商數據失敗: {e}", exc_info=True)
    
    def run(self):
        """執行完整同步流程"""
        logger.info("=" * 60)
        logger.info("開始同步個股財務與籌碼數據")
        logger.info("=" * 60)
        
        try:
            # 1. 取得目標股票
            stock_list = self.get_target_stocks()
            
            if not stock_list:
                logger.error("無目標股票，中止同步")
                return
            
            # 2. 同步營收
            self.sync_revenue_data(stock_list)
            
            # 3. 同步股權分散
            self.sync_shareholder_data(stock_list)

            # 4. 同步券商數據
            self.sync_broker_transactions(stock_list)
            
            logger.info("=" * 60)
            logger.info("✅ 所有數據同步完成")
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"同步過程發生錯誤: {e}", exc_info=True)
            raise

if __name__ == "__main__":
    sync = FinancialsSync()
    sync.run()
