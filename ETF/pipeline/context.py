"""
Pipeline Context

純資料容器，步驟間共享狀態。
服務實例（storage/notifier/finlab_srv/sql_storage）已移至 PipelineServices。
"""

import argparse
import pathlib
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

import pandas as pd


@dataclass
class PipelineContext:
    """Pipeline 上下文，步驟間共享的純資料狀態。"""

    # 必要參數
    args: argparse.Namespace
    output_dir: pathlib.Path

    # ETF 識別
    etf_code: str = "00981A"

    # 執行過程中動態更新的狀態
    df: Optional[pd.DataFrame] = None
    date_str: str = ""
    diff_logs: Optional[List[Dict[str, Any]]] = None
    secondary_stock_codes: List[str] = field(default_factory=list)
    bare_k_synced_count: int = 0
    all_etf_summaries: List[Dict[str, Any]] = field(default_factory=list)
    # MultiEtfStep 寫入、AumSyncStep 消費：每支 ETF 的基金資產摘要
    # key = ETF code，value = {aum, nav, units, nav_date}（任一欄位可為 None）
    etf_fund_assets: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    shareholder_signals: Dict[str, str] = field(default_factory=dict)
    news_context: List[Dict[str, Any]] = field(default_factory=list)

    # 驗證警告（DataValidationStep 寫入，NotifyStep 讀取）
    validation_warnings: List[str] = field(default_factory=list)

    # 散戶情緒指標（RetailSentimentStep 寫入）
    retail_sentiment: Dict[str, Any] = field(default_factory=dict)

    # 步驟產出登記（step_name → 寫入筆數），供後續步驟驗證前置條件
    # 用法：step 執行完後 ctx.completed_artifacts["SaveSnapshot"] = len(rows)
    completed_artifacts: Dict[str, int] = field(default_factory=dict)

    # CheckTradeDateStep：early-exit 原因（"data_up_to_date" or ""）
    skip_reason: str = ""

    # MultiEtfStep：每支 ETF 爬取來源記錄（etf_code, source, used_fallback, data_date）
    scrape_results: List[Dict[str, Any]] = field(default_factory=list)

    # 執行標誌
    is_dry_run: bool = False
    is_ci: bool = False
    force_run: bool = False
