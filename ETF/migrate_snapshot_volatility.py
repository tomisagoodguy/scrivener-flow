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
        print("Adding 'volatility' column to 'etf_holdings_snapshot'...")
        
        # Add column
        sql = """
        ALTER TABLE etf_holdings_snapshot 
        ADD COLUMN IF NOT EXISTS volatility NUMERIC;
        """
        conn.execute(text(sql))
        conn.commit()
    print("✅ Migration successful: volatility column added to snapshot.")

if __name__ == "__main__":
    migrate()
