"""
Base Step Abstract Class

所有 Pipeline 步驟的基礎類別。
"""

import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from ETF.pipeline.context import PipelineContext

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices


class BaseStep(ABC):
    """Pipeline 步驟基礎類別。"""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    @property
    @abstractmethod
    def name(self) -> str:
        """步驟名稱，用於 logging"""

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

        self.logger.info(f"▶️ Starting {self.name}...")

        try:
            ctx = self.execute(ctx, services)
            self.logger.info(f"✅ {self.name} completed")
        except Exception as e:
            self.logger.error(f"❌ {self.name} failed: {e}")
            raise

        return ctx
