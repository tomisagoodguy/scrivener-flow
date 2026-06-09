"""
Base Step Abstract Class

所有 Pipeline 步驟的基礎類別。
"""

import logging
from abc import ABC, abstractmethod
from enum import Enum
from typing import TYPE_CHECKING

from ETF.pipeline.context import PipelineContext

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices


class StepDomain(Enum):
    """步驟所屬領域，決定失敗時的容錯策略。

    SCRAPING / CORE → is_critical=True：失敗時中斷 pipeline 並發送 LINE 警報。
    其他域 → is_critical=False：失敗時 log error 後繼續，不中斷主流程。

    Domain 分類參考 stock-data-ai/stock-data finance_tools/domains/ 的領域設計。
    """
    SCRAPING = "scraping"         # 資料獲取（ScrapeStep、MultiEtfStep）
    CORE = "core"                 # 核心計算（Diff、SaveSnapshot、PriceAttach、DataValidation）
    MARKET = "market"             # 市場數據同步（OHLCV、Company、ADL、Treemap、AUM）
    ANALYTICS = "analytics"       # 分析計算（Flow、Overlap、BuyingPattern、Frontrunning 等）
    INTELLIGENCE = "intelligence" # 策略/訊號/籌碼（StrategySignal、ShareholderSignal）
    DELIVERY = "delivery"         # 通知/清理（Notify、Cleanup、NewsContext）


class BaseStep(ABC):
    """Pipeline 步驟基礎類別。"""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    @property
    @abstractmethod
    def name(self) -> str:
        """步驟名稱，用於 logging"""

    @property
    def domain(self) -> StepDomain:
        """步驟所屬領域（預設 ANALYTICS，輔助步驟）。關鍵步驟需覆寫為 SCRAPING 或 CORE。"""
        return StepDomain.ANALYTICS

    @property
    def is_critical(self) -> bool:
        """True 表示此步驟失敗時應中斷 pipeline；False 則靜默繼續。"""
        return self.domain in (StepDomain.SCRAPING, StepDomain.CORE)

    @abstractmethod
    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        """執行步驟。"""

    def should_skip(self, ctx: PipelineContext) -> bool:
        """判斷是否跳過此步驟（預設不跳過）。"""
        return False

    def run(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        """執行步驟的入口點（包含跳過檢查與 logging）。"""
        if self.should_skip(ctx):
            self.logger.info(f"⏭️ Skipping {self.name}")
            return ctx

        self.logger.info(f"▶️ Starting [{self.domain.value}] {self.name}...")

        try:
            ctx = self.execute(ctx, services)
            self.logger.info(f"✅ {self.name} completed")
        except Exception as e:
            self.logger.error(f"❌ {self.name} failed: {e}")
            raise

        return ctx
