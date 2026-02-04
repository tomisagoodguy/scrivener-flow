"""
Base Step Abstract Class

所有 Pipeline 步驟的基礎類別。
"""

import logging
from abc import ABC, abstractmethod

from ETF.pipeline.context import PipelineContext


class BaseStep(ABC):
    """
    Pipeline 步驟基礎類別。
    
    所有步驟都必須繼承此類別並實作 execute() 方法。
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @property
    @abstractmethod
    def name(self) -> str:
        """步驟名稱，用於 logging"""
        pass
    
    @abstractmethod
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        """
        執行步驟。
        
        Args:
            ctx: Pipeline 上下文
            
        Returns:
            更新後的 PipelineContext
        """
        pass
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        """
        判斷是否跳過此步驟。
        
        預設不跳過，子類別可覆寫此方法。
        
        Args:
            ctx: Pipeline 上下文
            
        Returns:
            True 表示跳過此步驟
        """
        return False
    
    def run(self, ctx: PipelineContext) -> PipelineContext:
        """
        執行步驟的入口點（包含跳過檢查與 logging）。
        
        Args:
            ctx: Pipeline 上下文
            
        Returns:
            更新後的 PipelineContext
        """
        if self.should_skip(ctx):
            self.logger.info(f"⏭️ Skipping {self.name}")
            return ctx
        
        self.logger.info(f"▶️ Starting {self.name}...")
        
        try:
            ctx = self.execute(ctx)
            self.logger.info(f"✅ {self.name} completed")
        except Exception as e:
            self.logger.error(f"❌ {self.name} failed: {e}")
            raise
        
        return ctx
