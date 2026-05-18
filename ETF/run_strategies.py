"""策略訊號執行腳本 — 每日 CI 呼叫，寫入 strategy_signals 表。

執行所有 ALL_STRATEGIES，取最近 N 個交易日的選股結果，
以 upsert 方式存入 DB，前端 /investment/strategy 頁面直接讀取。
"""

import os
import sys
import logging
from pathlib import Path
from datetime import date, timedelta

import pandas as pd

# 確保 project root 在 Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

import sqlalchemy
from sqlalchemy import text
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("run_strategies")


def get_engine() -> sqlalchemy.Engine:
    load_dotenv(".env.local")
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        raise ValueError("SUPABASE_DB_URL 環境變數未設定")
    return sqlalchemy.create_engine(url, connect_args={"client_encoding": "utf8"})


def upsert_signals(engine: sqlalchemy.Engine, records: list[dict]) -> None:
    if not records:
        return
    sql = text("""
        INSERT INTO strategy_signals (strategy_id, date, stock_id, score, is_selected)
        VALUES (:strategy_id, :date, :stock_id, :score, :is_selected)
        ON CONFLICT (strategy_id, date, stock_id)
        DO UPDATE SET
            score       = EXCLUDED.score,
            is_selected = EXCLUDED.is_selected
    """)
    chunk_size = 500
    with engine.connect() as conn:
        for i in range(0, len(records), chunk_size):
            conn.execute(sql, records[i : i + chunk_size])
        conn.commit()
    logger.info(f"Upserted {len(records)} strategy_signals records.")


def run(days: int = 5) -> None:
    import finlab
    api_key = os.getenv("FINLAB_API_KEY")
    if not api_key:
        raise ValueError("FINLAB_API_KEY 環境變數未設定")
    finlab.login(api_token=api_key)

    from ETF.strategies import ALL_STRATEGIES
    from ETF.strategies.shared_cache import StrategyDataCache

    engine = get_engine()
    cache = StrategyDataCache()

    cutoff = date.today() - timedelta(days=days + 30)  # 讓 FinLab 有足夠歷史資料

    all_records: list[dict] = []

    for strategy in ALL_STRATEGIES:
        logger.info(f"執行策略：{strategy.strategy_id} ({strategy.description})")
        try:
            positions = strategy.get_positions(cache)
        except Exception as e:
            logger.error(f"策略 {strategy.strategy_id} 執行失敗：{e}")
            continue

        if positions is None or positions.empty:
            logger.warning(f"策略 {strategy.strategy_id} 無回傳結果，跳過。")
            continue

        # 只取最近 days 個交易日
        recent = positions.tail(days)

        try:
            for dt, row in recent.iterrows():
                date_str: date = pd.Timestamp(str(dt)).date()
                if date_str < cutoff:
                    continue
                for stock_id, value in row.items():
                    if value is None:
                        continue
                    is_selected = bool(value) if isinstance(value, bool) else float(value) > 0
                    score = float(value) if not isinstance(value, bool) else (1.0 if value else 0.0)
                    all_records.append({
                        "strategy_id": strategy.strategy_id,
                        "date": str(date_str),
                        "stock_id": str(stock_id),
                        "score": score,
                        "is_selected": is_selected,
                    })
        except Exception as e:
            logger.error(f"策略 {strategy.strategy_id} 結果處理失敗：{e}")
            continue

        selected_count = recent.iloc[-1].sum() if not recent.empty else 0
        logger.info(f"  → 最新日期選出 {int(selected_count)} 支股票")

    upsert_signals(engine, all_records)
    logger.info("策略訊號更新完成。")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="執行量化策略並寫入 strategy_signals")
    parser.add_argument("--days", type=int, default=5, help="保存最近幾個交易日的訊號（預設 5）")
    args = parser.parse_args()
    run(days=args.days)
