"""
Pipeline Steps 單元測試
"""

import pytest
import argparse
import pathlib
from unittest.mock import Mock, MagicMock, patch


class TestBaseStep:
    """BaseStep 測試集"""

    @pytest.fixture
    def mock_ctx(self, tmp_path):
        """建立 mock context"""
        from ETF.pipeline.context import PipelineContext
        
        args = argparse.Namespace()
        args.dry_run = False
        args.force = False
        
        return PipelineContext(
            args=args,
            output_dir=tmp_path / "output",
            etf_code="00981A"
        )

    def test_step_name(self):
        """測試 Step 名稱"""
        from ETF.pipeline.steps.base import BaseStep
        
        # 建立一個測試用的具體實作
        class TestStep(BaseStep):
            @property
            def name(self) -> str:
                return "TestStep"
            
            def execute(self, ctx):
                pass
        
        step = TestStep()
        assert step.name == "TestStep"

    def test_step_should_skip_default(self, mock_ctx):
        """測試預設不跳過"""
        from ETF.pipeline.steps.base import BaseStep
        
        class TestStep(BaseStep):
            @property
            def name(self) -> str:
                return "TestStep"
            
            def execute(self, ctx):
                pass
        
        step = TestStep()
        assert step.should_skip(mock_ctx) is False


class TestScrapeStep:
    """ScrapeStep 測試集"""

    @pytest.fixture
    def mock_ctx(self, tmp_path):
        """建立 mock context"""
        import pandas as pd
        from ETF.pipeline.context import PipelineContext
        
        args = argparse.Namespace()
        args.dry_run = False
        args.force = False
        
        return PipelineContext(
            args=args,
            output_dir=tmp_path / "output",
            etf_code="00981A"
        )

    def test_scrape_step_is_always_executed(self, mock_ctx):
        """測試 ScrapeStep 沒有 should_skip 邏輯，總是執行"""
        import pandas as pd
        from ETF.pipeline.steps.scrape_step import ScrapeStep
        
        step = ScrapeStep()
        mock_ctx.df = pd.DataFrame([{"code": "2330"}])  # 即使有資料
        
        # ScrapeStep 沒有覆寫 should_skip，使用 BaseStep 預設值
        assert step.should_skip(mock_ctx) is False

    def test_scrape_step_default_should_skip(self, mock_ctx):
        """測試當 df 為空時不應跳過"""
        from ETF.pipeline.steps.scrape_step import ScrapeStep
        
        step = ScrapeStep()
        # df 預設為 None
        
        assert step.should_skip(mock_ctx) is False
