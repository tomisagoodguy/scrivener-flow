import os
import sys
import logging
import argparse
from typing import Optional

# Setup Path
try:
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(project_root)
except Exception:
    sys.path.append(os.getcwd())

from ETF.ai_report.reporter import AIReporter  # noqa: E402
from ETF.config.etf_registry import ALL_ETF_CODES  # noqa: E402

MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-3-flash",
    "gemini-2.5-flash-lite",
    "gemma-3-27b",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


def build_sector_summary(engine, target_date: Optional[str] = None) -> str:
    """從 sector_strength 查詢當日/本週強勢族群 TOP 5，回傳純文字摘要。

    當日無資料時回傳空字串（降級處理）。
    """
    from datetime import date as _date
    from sqlalchemy import text

    query_date = target_date or _date.today().strftime("%Y-%m-%d")

    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT category, ret_1d, ret_5d, breadth, strength_score
                    FROM sector_strength
                    WHERE date = :d
                      AND ret_1d > 0
                      AND ret_5d > 0
                      AND breadth >= 0.40
                    ORDER BY strength_score DESC NULLS LAST
                    LIMIT 10
                """),
                {"d": query_date},
            ).fetchall()
    except Exception as e:
        logger.warning(f"build_sector_summary query failed: {e}")
        return ""

    if not rows:
        return ""

    top_1d = rows[:5]
    top_5d = sorted(rows, key=lambda r: (r[2] or 0), reverse=True)[:5]

    lines = [f"📊 今日強勢族群 ({query_date})"]
    for i, r in enumerate(top_1d, 1):
        pct = f"{float(r[1]) * 100:+.2f}%" if r[1] is not None else "N/A"
        lines.append(f"{i}. {r[0]}  {pct}")

    lines.append("")
    lines.append("📈 本週強勢族群")
    for i, r in enumerate(top_5d, 1):
        pct = f"{float(r[2]) * 100:+.2f}%" if r[2] is not None else "N/A"
        lines.append(f"{i}. {r[0]}  {pct}")

    # 策略命中：強勢族群（ret_1d 前 10）內，is_strategy_hit=True，按 momentum_score 降序前 10
    try:
        with engine.connect() as conn:
            strong_cats = [r[0] for r in rows]
            placeholders = ",".join(f":c{i}" for i in range(len(strong_cats)))
            hit_rows = conn.execute(
                text(f"""
                    SELECT stock_name, stock_id, category, momentum_score
                    FROM sector_strength_stocks
                    WHERE date = :d
                      AND is_strategy_hit = TRUE
                      AND category IN ({placeholders})
                    ORDER BY momentum_score DESC NULLS LAST
                    LIMIT 10
                """),
                {"d": query_date, **{f"c{i}": c for i, c in enumerate(strong_cats)}},
            ).fetchall()

        if hit_rows:
            lines.append("")
            lines.append("⚡ 族群策略命中（均線多頭＋月營收成長）")
            for i, r in enumerate(hit_rows, 1):
                name = r[0] or r[1]
                cat_short = r[2].split(":")[-1] if ":" in r[2] else r[2]
                score = f"{float(r[3]) * 100:+.2f}%" if r[3] is not None else ""
                lines.append(f"{i}. {name} {r[1]}  [{cat_short}]  {score}")
    except Exception as e:
        logger.warning(f"build_sector_summary strategy hits query failed: {e}")

    return "\n".join(lines)


def run_report(etf_code: str, dry_run: bool = False) -> None:
    """為單一 ETF 執行 AI 報告生成。

    Args:
        etf_code: ETF 代碼，例如 "00981A"。
        dry_run: True 時印出報告前 200 字，不發送 LINE 通知。
    """
    logger.info(f"Starting AI report for {etf_code}...")
    AIReporter(etf_code, MODELS_TO_TRY).run(dry_run=dry_run)
    logger.info(f"AI report for {etf_code} completed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AI Investment Report")
    parser.add_argument(
        "--dry-run", action="store_true", help="Generate report without sending to LINE"
    )
    args = parser.parse_args()

    for etf_code in ALL_ETF_CODES:
        try:
            run_report(etf_code, dry_run=args.dry_run)
        except Exception as e:
            logger.error(f"AI report for {etf_code} failed: {e}", exc_info=True)


if __name__ == "__main__":
    main()
