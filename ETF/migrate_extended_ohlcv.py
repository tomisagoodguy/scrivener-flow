import os
import sqlalchemy
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
project_ref = supabase_url.split("//")[1].split(".")[0]
db_password = os.getenv("SUPABASE_DB_PASSWORD")

DATABASE_URL = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"

def migrate():
    engine = sqlalchemy.create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Adding 'amount' and 'margin_ratio' columns to 'stock_prices_daily'...")
        
        # Add columns
        sql = """
        ALTER TABLE stock_prices_daily 
        ADD COLUMN IF NOT EXISTS amount NUMERIC,
        ADD COLUMN IF NOT EXISTS margin_ratio NUMERIC;
        """
        conn.execute(text(sql))
        conn.commit()
    print("✅ Migration successful: Columns added.")

if __name__ == "__main__":
    migrate()
