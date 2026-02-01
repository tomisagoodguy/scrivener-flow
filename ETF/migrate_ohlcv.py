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
        print("Creating 'stock_prices_daily' table...")
        
        # Create table
        sql = """
        CREATE TABLE IF NOT EXISTS stock_prices_daily (
            stock_code TEXT NOT NULL,
            data_date DATE NOT NULL,
            open NUMERIC,
            high NUMERIC,
            low NUMERIC,
            close NUMERIC,
            volume BIGINT,
            currency TEXT DEFAULT 'TWD',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (stock_code, data_date)
        );
        
        -- Enable RLS if needed, but for now just ensure it exists
        ALTER TABLE stock_prices_daily ENABLE ROW LEVEL SECURITY;
        
        -- Policy for anonymous select (read-only for web)
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access for stock_prices_daily'
            ) THEN
                CREATE POLICY "Allow public read access for stock_prices_daily" 
                ON stock_prices_daily FOR SELECT USING (true);
            END IF;
        END $$;
        """
        conn.execute(text(sql))
        conn.commit()
    print("✅ Migration successful: stock_prices_daily table created.")

if __name__ == "__main__":
    migrate()
