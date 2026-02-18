"""協調層：依序呼叫 fetcher → analyzer → prompt_builder → Gemini → notifier。"""

import logging
import os

import google.generativeai as genai
import pandas as pd
from dotenv import load_dotenv

from ETF.ai_report.analyzer import StockAnalyzer
from ETF.ai_report.fetcher import ETFDataFetcher
from ETF.ai_report.prompt_builder import build_report_prompt
from ETF.database.sql_storage import SQLStorage
from ETF.notifiers.line_notifier import LineNotifier

logger = logging.getLogger(__name__)


class AIReporter:
    """協調整個 AI 報告生成流程。"""

    def __init__(self, etf_code: str, models_to_try: list[str]) -> None:
        self.etf_code = etf_code
        self.models_to_try = models_to_try

    def run(self, dry_run: bool = False) -> None:
        """執行完整的 AI 報告生成與發送流程。

        Args:
            dry_run: True 時印出報告前 200 字，不發送 LINE 通知。
        """
        # 1. 載入環境變數
        if os.path.exists(".env.local"):
            load_dotenv(".env.local")
        else:
            load_dotenv()

        # 2. 驗證 API Key
        api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        if not api_key:
            logger.error("GOOGLE_GEMINI_API_KEY is missing")
            return

        # 3. 初始化 DB Storage
        try:
            storage = SQLStorage()
        except Exception as e:
            logger.error(f"Failed to initialize SQLStorage: {e}")
            return

        # 4. 獲取資料
        fetcher = ETFDataFetcher(storage.engine)
        logger.info("Fetching holdings...")
        try:
            holdings_df = fetcher.fetch_holdings(self.etf_code)
        except Exception as e:
            logger.error(f"Failed to fetch holdings: {e}")
            return

        if holdings_df.empty:
            logger.error(f"No holdings found for {self.etf_code}")
            return

        stock_codes = holdings_df["stock_code"].tolist()
        logger.info("Fetching technical/broker/chip data...")
        prices_df = fetcher.fetch_technical_data(stock_codes)
        broker_df = fetcher.fetch_broker_data(stock_codes)
        chips_df = fetcher.fetch_chip_data(stock_codes)

        # 5. 分析個股
        logger.info("Analyzing stocks...")
        analyzer = StockAnalyzer()
        technical_map: dict[str, dict] = {}
        for code in stock_codes:
            try:
                result = analyzer.analyze(code, prices_df, broker_df, chips_df)
                if result:
                    technical_map[code] = result
            except Exception:
                continue

        # 6. 組裝 Prompt
        top_holdings = (
            holdings_df.head(10)[
                ["stock_name", "stock_code", "weight", "revenue_yoy", "revenue_mom"]
            ].to_dict("records")
        )
        stats = {
            "totalHoldings": int(len(holdings_df)),
            "top10Weight": float(holdings_df.head(10)["weight"].sum()),
            "avgYoY": (
                float(holdings_df["revenue_yoy"].mean())
                if not pd.isna(holdings_df["revenue_yoy"].mean())
                else 0.0
            ),
        }
        prompt = build_report_prompt(holdings_df, stats, technical_map, top_holdings)

        # 7. 呼叫 Gemini
        genai.configure(api_key=api_key)
        logger.info("Calling Gemini...")
        for model_name in self.models_to_try:
            try:
                logger.info(f"Using model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)

                if response and response.text:
                    logger.info("Generated report successfully.")

                    # 8. Dry Run 模式
                    if dry_run:
                        logger.info("🐛 Dry Run Mode: Report generated but not sent.")
                        print(
                            f"\n[Dry Run Report Output]\n{response.text[:200]}...\n"
                            "(Truncated for log)\n"
                        )
                        return

                    # 9. 發送 LINE 通知（優先使用 STOCK_ token）
                    token_env = (
                        "STOCK_LINE_CHANNEL_ACCESS_TOKEN"
                        if os.getenv("STOCK_LINE_CHANNEL_ACCESS_TOKEN")
                        else "LINE_CHANNEL_ACCESS_TOKEN"
                    )
                    user_id_env = (
                        "STOCK_LINE_USER_ID"
                        if os.getenv("STOCK_LINE_USER_ID")
                        else "LINE_USER_ID"
                    )
                    notifier = LineNotifier(token_env=token_env, user_id_env=user_id_env)
                    notifier.broadcast_ai_report(response.text)
                    return

            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}")
                continue

        logger.error("All models failed.")
