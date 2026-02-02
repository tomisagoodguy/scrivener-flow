
import os
from pathlib import Path
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

# Add ETF directory to path for imports
ETF_DIR = Path(__file__).parent

# Load .env.local from project root
project_root = ETF_DIR.parent
env_path = project_root / '.env.local'
load_dotenv(env_path)

def check_db_latest():
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    project_ref = supabase_url.split("//")[1].split(".")[0]
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    db_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
    engine = sqlalchemy.create_engine(db_url)
    
    with engine.connect() as conn:
        print("--- Database Snapshot ---")
        broker_count = conn.execute(text("SELECT count(*) FROM stock_broker_transactions")).scalar()
        broker_latest = conn.execute(text("SELECT max(data_date) FROM stock_broker_transactions")).scalar()
        print(f"Broker Transactions: {broker_count} records (Latest: {broker_latest})")
        
        # Check specific stock from screenshot (6415 or whatever code)
        # The URL in screenshot says /investment/dashboard/6510
        target_code = '6510'
        code_latest = conn.execute(text("SELECT max(data_date) FROM stock_broker_transactions WHERE stock_code = :code"), {"code": target_code}).scalar()
        print(f"Stock {target_code} Latest Date in DB: {code_latest}")

if __name__ == "__main__":
    check_db_latest()
