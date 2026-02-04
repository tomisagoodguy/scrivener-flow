"""
Pipeline Context 單元測試
"""

import pytest
import argparse
import pathlib
from unittest.mock import Mock


class TestPipelineContext:
    """PipelineContext 測試集"""

    @pytest.fixture
    def mock_args(self):
        """建立 mock argparse.Namespace"""
        args = argparse.Namespace()
        args.dry_run = False
        args.force = False
        return args
    
    @pytest.fixture
    def output_dir(self, tmp_path):
        """建立臨時輸出目錄"""
        return tmp_path / "output"

    def test_context_creation_with_defaults(self, mock_args, output_dir):
        """測試使用預設值建立 Context"""
        from ETF.pipeline.context import PipelineContext
        
        ctx = PipelineContext(args=mock_args, output_dir=output_dir)
        
        assert ctx.etf_code == "00981A"
        assert ctx.is_dry_run is False
        assert ctx.df is None
        assert ctx.diff_logs is None

    def test_context_creation_with_custom_etf(self, mock_args, output_dir):
        """測試自訂 ETF 代碼"""
        from ETF.pipeline.context import PipelineContext
        
        ctx = PipelineContext(
            args=mock_args, 
            output_dir=output_dir,
            etf_code="00940"
        )
        
        assert ctx.etf_code == "00940"

    def test_context_dry_run_mode(self, mock_args, output_dir):
        """測試 dry_run 模式"""
        from ETF.pipeline.context import PipelineContext
        
        ctx = PipelineContext(
            args=mock_args, 
            output_dir=output_dir,
            is_dry_run=True
        )
        
        assert ctx.is_dry_run is True

    def test_context_state_update(self, mock_args, output_dir):
        """測試狀態更新"""
        import pandas as pd
        from ETF.pipeline.context import PipelineContext
        
        ctx = PipelineContext(args=mock_args, output_dir=output_dir)
        
        # 模擬步驟更新狀態
        ctx.df = pd.DataFrame([{"code": "2330", "shares": 1000}])
        ctx.diff_logs = [{"action": "add", "code": "2330"}]
        ctx.date_str = "20260204"
        
        assert len(ctx.df) == 1
        assert len(ctx.diff_logs) == 1
        assert ctx.date_str == "20260204"

    def test_context_lazy_storage_init(self, mock_args, output_dir):
        """測試 storage 延遲初始化"""
        from ETF.pipeline.context import PipelineContext
        
        ctx = PipelineContext(args=mock_args, output_dir=output_dir)
        
        # 首次存取前應為 None
        assert ctx._storage is None
        
        # 注意：實際存取會觸發初始化，需要 mock 或 skip
        # storage = ctx.storage
        # assert storage is not None
