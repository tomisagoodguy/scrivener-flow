
import os
from pathlib import Path
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

# Load .env.local
load_dotenv('.env.local')

def clean_stale_data():
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    project_ref = supabase_url.split("//")[1].split(".")[0]
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    db_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
    engine = sqlalchemy.create_engine(db_url)
    
    with engine.connect() as conn:
        print("--- Cleaning Stale Broker Data ---")
        # Delete data older than 2025 to remove the "mixed" old tests
        res = conn.execute(text("DELETE FROM stock_broker_transactions WHERE data_date < '2025-05-01'"))
        conn.commit()
        print(f"✅ Successfully removed {res.rowcount} stale records from 2023/2024.")

if __name__ == "__main__":
    clean_stale_data()
