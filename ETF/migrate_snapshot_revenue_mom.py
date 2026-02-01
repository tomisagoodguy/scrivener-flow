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
        print("Adding revenue_mom column to 'etf_holdings_snapshot'...")
        
        sqls = [
            "ALTER TABLE etf_holdings_snapshot ADD COLUMN IF NOT EXISTS revenue_mom NUMERIC;"
        ]
        
        for s in sqls:
            try:
                conn.execute(text(s))
                print(f"Executed: {s.strip()}")
            except Exception as e:
                print(f"Error executing {s}: {e}")
            
        conn.commit()
    print("✅ Migration successful: revenue_mom added.")

if __name__ == "__main__":
    migrate()
