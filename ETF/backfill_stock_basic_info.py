"""
backfill_stock_basic_info.py

從 strategy_signals 取出所有出現過的股票代碼，
用 FinLab company_info 補全 stock_basic_info 的 name_short / industry。

執行：
    uv run --with "finlab>=1.5.9" python ETF/backfill_stock_basic_info.py
"""

import os
import sys
import logging

import finlab
from finlab import data
from sqlalchemy import text
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ETF.database.sql_storage import SQLStorage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    load_dotenv(".env.local")

    finlab.login()

    storage = SQLStorage()

    # 1. 取出所有策略訊號股票代碼
    with storage.engine.connect() as conn:
        rows = conn.execute(text("SELECT DISTINCT stock_id FROM strategy_signals ORDER BY stock_id")).fetchall()
    stock_codes = [r[0] for r in rows]
    logger.info(f"strategy_signals 共 {len(stock_codes)} 支不重複股票")

    # 2. 從 FinLab 取公司基本資料
    logger.info("從 FinLab 取 company_info …")
    df = data.get("company_basic_info")

    if df.empty:
        logger.error("FinLab company_basic_info 回傳空資料")
        sys.exit(1)

    # FinLab company_basic_info: index = stock_id，欄位含「公司簡稱」「產業類別」
    df = df.reset_index()
    if "stock_id" not in df.columns:
        logger.error(f"找不到 stock_id 欄位，現有欄位：{df.columns.tolist()}")
        sys.exit(1)

    df["stock_code"] = df["stock_id"].astype(str).str.strip()
    df = df[df["stock_code"].isin(stock_codes)]
    logger.info(f"FinLab 有 {len(df)} 支股票的資料（共查詢 {len(stock_codes)} 支）")

    # 3. Upsert stock_basic_info
    upsert_sql = text("""
        INSERT INTO stock_basic_info (stock_code, name_short, industry, updated_at)
        VALUES (:stock_code, :name_short, :industry, NOW())
        ON CONFLICT (stock_code) DO UPDATE SET
            name_short = COALESCE(EXCLUDED.name_short, stock_basic_info.name_short),
            industry   = COALESCE(EXCLUDED.industry,   stock_basic_info.industry),
            updated_at = NOW()
    """)

    updated = 0
    with storage.engine.connect() as conn:
        for _, row in df.iterrows():
            name = str(row.get("公司簡稱") or row.get("name") or "").strip() or None
            industry = str(row.get("產業類別") or "").strip() or None
            if not name and not industry:
                continue
            conn.execute(upsert_sql, {
                "stock_code": row["stock_code"],
                "name_short": name,
                "industry": industry,
            })
            updated += 1
        conn.commit()

    logger.info(f"✅ 完成：upsert {updated} 筆到 stock_basic_info")


if __name__ == "__main__":
    main()
