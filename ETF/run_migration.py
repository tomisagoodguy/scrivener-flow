"""
執行特定 SQL migration 檔案的腳本
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

# Load .env.local from project root
project_root = Path(__file__).parent.parent
env_path = project_root / '.env.local'
load_dotenv(env_path)

def run_migration(migration_file: str):
    """執行指定的 SQL migration"""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    if not supabase_url:
        print("❌ Error: NEXT_PUBLIC_SUPABASE_URL not found")
        sys.exit(1)
    
    project_ref = supabase_url.split("//")[1].split(".")[0]
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    
    if not db_password:
        print("❌ Error: SUPABASE_DB_PASSWORD not found")
        sys.exit(1)
    
    DATABASE_URL = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
    
    print(f"🔌 Connecting to Supabase...")
    
    try:
        engine = sqlalchemy.create_engine(DATABASE_URL)
        
        # Read migration file
        full_path = os.path.join('migrations', migration_file)
        if not os.path.exists(full_path):
            print(f"❌ Migration file not found: {full_path}")
            sys.exit(1)
        
        with open(full_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        print(f"📜 Executing migration: {migration_file}")
        
        with engine.connect() as connection:
            connection.execute(text(sql_script))
            connection.commit()
        
        print(f"✅ Migration '{migration_file}' applied successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if "password" in str(e).lower():
            print("👉 Check if SUPABASE_DB_PASSWORD in .env.local is correct.")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <migration_file>")
        print("Example: python run_migration.py 20260202_stock_financials.sql")
        sys.exit(1)
    
    migration_file = sys.argv[1]
    run_migration(migration_file)
