"""
修正 pocket ETF shares 單位：張 → 股（× 1000）

背景：pocket_scraper.py 曾誤將 shares 除以 1000 存成「張」，
而系統其他部分（diff_engine / 前端）均以「股」為單位。
此腳本將受影響的 ETF 的 shares 欄位全部乘以 1000，修復歷史資料。

受影響資料表：
  - etf_holdings_snapshot  (shares)
  - etf_diff_logs          (diff_shares, curr_shares, prev_shares)
  - etf_weight_history     (shares)

執行方式：
  uv run python ETF/scripts/fix_pocket_shares_unit.py
  uv run python ETF/scripts/fix_pocket_shares_unit.py --dry-run
"""

import argparse
import logging
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# 千股單位 ETF（pocket_scraper + nomura + uni ezmoney 回傳千股，非股）
# 執行過的 ETF 已標記；重複執行無害（只要 DB 未再被錯誤寫入）
POCKET_ETF_CODES = ["00980A", "00985A", "00988A"]


def get_engine():
    load_dotenv(".env.local")
    url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if not url:
        logger.error("SUPABASE_DB_URL / DATABASE_URL 未設定")
        sys.exit(1)
    return create_engine(url, connect_args={"client_encoding": "utf8"})


def preview(engine, codes: list[str]) -> None:
    with engine.connect() as conn:
        for code in codes:
            row = conn.execute(
                text("SELECT COUNT(*) FROM etf_holdings_snapshot WHERE etf_code = :c"),
                {"c": code},
            ).scalar()
            sample = conn.execute(
                text(
                    "SELECT stock_code, shares FROM etf_holdings_snapshot "
                    "WHERE etf_code = :c ORDER BY data_date DESC LIMIT 3"
                ),
                {"c": code},
            ).fetchall()
            logger.info("[%s] etf_holdings_snapshot: %d rows", code, row or 0)
            for s in sample:
                logger.info("  股票 %s  shares=%s（修正後→ %s）", s[0], s[1], (s[1] or 0) * 1000)


def fix(engine, codes: list[str], dry_run: bool) -> None:
    with engine.begin() as conn:
        for code in codes:
            # ── 1. etf_holdings_snapshot ──────────────────────────────────
            r1 = conn.execute(
                text(
                    "UPDATE etf_holdings_snapshot "
                    "SET shares = shares * 1000 "
                    "WHERE etf_code = :c"
                ),
                {"c": code},
            )
            logger.info("[%s] etf_holdings_snapshot updated: %d rows", code, r1.rowcount)

            # ── 2. etf_diff_logs ──────────────────────────────────────────
            r2 = conn.execute(
                text(
                    "UPDATE etf_diff_logs "
                    "SET diff_shares = diff_shares * 1000, "
                    "    curr_shares  = curr_shares  * 1000, "
                    "    prev_shares  = prev_shares  * 1000 "
                    "WHERE etf_code = :c"
                ),
                {"c": code},
            )
            logger.info("[%s] etf_diff_logs updated: %d rows", code, r2.rowcount)

            # ── 3. etf_weight_history ─────────────────────────────────────
            r3 = conn.execute(
                text(
                    "UPDATE etf_weight_history "
                    "SET shares = shares * 1000 "
                    "WHERE etf_code = :c"
                ),
                {"c": code},
            )
            logger.info("[%s] etf_weight_history updated: %d rows", code, r3.rowcount)

        if dry_run:
            logger.info("Dry-run：回滾所有變更")
            conn.execute(text("ROLLBACK"))
        else:
            logger.info("提交所有變更完成")


def main() -> None:
    parser = argparse.ArgumentParser(description="修正 pocket ETF shares 單位")
    parser.add_argument("--dry-run", action="store_true", help="預覽，不實際寫入")
    args = parser.parse_args()

    engine = get_engine()

    logger.info("受影響 ETF：%s", POCKET_ETF_CODES)
    preview(engine, POCKET_ETF_CODES)

    if args.dry_run:
        logger.info("=== Dry-run 模式，不寫入 DB ===")
        fix(engine, POCKET_ETF_CODES, dry_run=True)
        return

    confirm = input("確認將以上 ETF 的 shares 全部 × 1000？(yes/no) ").strip().lower()
    if confirm != "yes":
        logger.info("取消")
        return

    fix(engine, POCKET_ETF_CODES, dry_run=False)
    logger.info("完成，請重新整理前端頁面確認億元金額已正常顯示")


if __name__ == "__main__":
    main()
