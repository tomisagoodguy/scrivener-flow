import os
import sys
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

# Load env
load_dotenv('.env.local')

# Parse Project ID from NEXT_PUBLIC_SUPABASE_URL
# URL format: https://[project_ref].supabase.co
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
if not supabase_url:
    print("❌ Error: NEXT_PUBLIC_SUPABASE_URL not found")
    sys.exit(1)

project_ref = supabase_url.split("//")[1].split(".")[0]

DB_HOST = f"db.{project_ref}.supabase.co"
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PORT = "5432" # Direct connection
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")

if not DB_PASSWORD:
    print("❌ Error: SUPABASE_DB_PASSWORD not found in .env.local")
    sys.exit(1)

# Construct connection string
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def main():
    print(f"🔌 Connecting to Supabase Direct ({DB_HOST}:5432)...")
    
    try:
        engine = sqlalchemy.create_engine(DATABASE_URL)
        
        # Read migration file
        migration_file = 'migrations/20260131_init_etf_tracker.sql'
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_script = f.read()

        print(f"📜 Executing migration: {migration_file}")
        
        with engine.connect() as connection:
            connection.execute(text(sql_script))
            connection.commit()
            
        print("✅ Migration applied successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if "password" in str(e).lower():
            print("👉 Check if SUPABASE_DB_PASSWORD in .env.local is correct.")
        
if __name__ == "__main__":
    main()
