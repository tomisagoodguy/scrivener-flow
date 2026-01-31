import os
import sys
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import create_engine
import logging

logger = logging.getLogger(__name__)

def get_db_engine():
    """
    Create and return SQLAlchemy engine for Supabase
    """
    # Load env
    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
    else:
        load_dotenv()

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    
    missing = []
    if not supabase_url: missing.append("NEXT_PUBLIC_SUPABASE_URL")
    if not db_password: missing.append("SUPABASE_DB_PASSWORD")
    
    if missing:
        msg = f"Missing Supabase credentials: {', '.join(missing)}. Please check your .env.local or GitHub Secrets."
        logger.error(msg)
        raise ValueError(msg)

    try:
        project_ref = supabase_url.split("//")[1].split(".")[0]
        
        DB_HOST = f"db.{project_ref}.supabase.co"
        DB_PORT = "6543"  # 使用 Transaction Pooler 埠號 (更適合 CI/CD 環境)
        DB_USER = "postgres"
        DB_NAME = "postgres"
        
        # 使用連接池 host 並加入 sslmode=require
        DATABASE_URL = f"postgresql://{DB_USER}.{project_ref}:{db_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require"
        
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        return engine
    except Exception as e:
        logger.error(f"Failed to create DB engine: {e}")
        raise
