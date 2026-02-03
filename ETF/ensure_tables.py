import os
import sqlalchemy
from sqlalchemy import text
from dotenv import load_dotenv

def ensure_tables():
    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
    else:
        load_dotenv()
        
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        db_password = os.getenv("SUPABASE_DB_PASSWORD")
        if not supabase_url or not db_password:
            print("Required environment variables not found.")
            return
        
        project_ref = supabase_url.split("//")[1].split(".")[0]
        db_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"

    engine = sqlalchemy.create_engine(db_url)
    with engine.connect() as conn:
        print("Creating table stock_basic_info if not exists...")
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
        print("Done.")

if __name__ == "__main__":
    ensure_tables()
