import os
import sqlalchemy
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
if not supabase_url:
    print("Error: NEXT_PUBLIC_SUPABASE_URL not found.")
    exit(1)

project_ref = supabase_url.split("//")[1].split(".")[0]
db_password = os.getenv("SUPABASE_DB_PASSWORD")

if not db_password:
    print("Error: SUPABASE_DB_PASSWORD not found.")
    exit(1)

DATABASE_URL = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"

def migrate():
    engine = sqlalchemy.create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Adding new columns to 'etf_holdings_snapshot'...")
        
        # Add columns
        sqls = [
            "ALTER TABLE etf_holdings_snapshot ADD COLUMN IF NOT EXISTS market_cap NUMERIC;",
            "ALTER TABLE etf_holdings_snapshot ADD COLUMN IF NOT EXISTS is_high_5d BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE etf_holdings_snapshot ADD COLUMN IF NOT EXISTS is_high_20d BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE etf_holdings_snapshot ADD COLUMN IF NOT EXISTS is_high_200d BOOLEAN DEFAULT FALSE;"
        ]
        
        for s in sqls:
            conn.execute(text(s))
            print(f"Executed: {s.strip()}")
            
        conn.commit()
    print("✅ Migration successful: New stats columns added.")

if __name__ == "__main__":
    migrate()
