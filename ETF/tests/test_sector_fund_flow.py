"""
Tests for sector-fund-flow change.

TDD: tests written BEFORE implementing
  - SectorStrengthStep._build_industry_map + ctx.stock_industry_map population
  - FlowComputeStep._aggregate_by_sector (two-level by_sector)

Spec: openspec/changes/sector-fund-flow/specs/sector-fund-flow-pipeline/spec.md
Design: openspec/changes/sector-fund-flow/design.md
"""

import argparse
import pathlib
from unittest.mock import MagicMock

import pandas as pd

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.flow_compute_step import FlowComputeStep
from ETF.pipeline.steps.sector_strength_step import SectorStrengthStep


def _ctx(**kwargs) -> PipelineContext:
    return PipelineContext(
        args=argparse.Namespace(days=30, dry_run=False),
        output_dir=pathlib.Path("."),
        **kwargs,
    )


# ---------------------------------------------------------------------------
# PipelineContext default (task 2.1)
# ---------------------------------------------------------------------------


def test_context_stock_industry_map_defaults_empty():
    ctx = _ctx()
    assert ctx.stock_industry_map == {}


# ---------------------------------------------------------------------------
# SectorStrengthStep: share stock-to-industry mapping (task 2.2)
# ---------------------------------------------------------------------------


def test_build_industry_map_aggregates_categories():
    """Scenario: Mapping populated from fetched themes."""
    exploded = pd.DataFrame(
        {
            "stock_id": ["2330", "2330", "2317"],
            "category": ["半導體", "半導體:晶圓製造", "電腦及週邊設備"],
        }
    )
    m = SectorStrengthStep._build_industry_map(exploded)
    assert m["2330"] == ["半導體", "半導體:晶圓製造"]
    assert m["2317"] == ["電腦及週邊設備"]


def test_build_industry_map_dedupes_and_skips_blank():
    exploded = pd.DataFrame(
        {
            "stock_id": ["2330", "2330", "2330"],
            "category": ["半導體", "半導體", "  "],
        }
    )
    m = SectorStrengthStep._build_industry_map(exploded)
    assert m["2330"] == ["半導體"]


def test_sector_strength_keeps_empty_map_when_finlab_unavailable():
    """Scenario: FinLab data unavailable -> map stays empty, no raise."""
    ctx = _ctx(date_str="2026-06-16")
    services = MagicMock()
    services.finlab_srv._client.login.return_value = False

    result = SectorStrengthStep().execute(ctx, services)

    assert result is ctx
    assert ctx.stock_industry_map == {}


# ---------------------------------------------------------------------------
# FlowComputeStep._aggregate_by_sector (tasks 3.1 - 3.3)
# ---------------------------------------------------------------------------


def test_aggregate_by_sector_two_stocks_across_themes():
    """
    Spec example: two stocks across themes.
    GIVEN inflow 2330(total_nt=100, ["半導體","半導體:晶圓製造"]);
          outflow 2317(total_nt=-40, ["電腦及週邊設備"])
    """
    inflow = [{"stock_code": "2330", "total_nt": 100}]
    outflow = [{"stock_code": "2317", "total_nt": -40}]
    industry_map = {
        "2330": ["半導體", "半導體:晶圓製造"],
        "2317": ["電腦及週邊設備"],
    }

    result = FlowComputeStep._aggregate_by_sector(inflow, outflow, industry_map)

    # ordered by net_nt descending
    assert [p["sector"] for p in result] == ["半導體", "電腦及週邊設備"]

    semi = result[0]
    assert semi["in_nt"] == 100
    assert semi["out_nt"] == 0
    assert semi["net_nt"] == 100
    assert semi["in_count"] == 1
    assert semi["out_count"] == 0
    assert semi["net_nt"] == semi["in_nt"] - semi["out_nt"]
    child_names = {c["sector"]: c for c in semi["children"]}
    assert "半導體:晶圓製造" in child_names
    assert child_names["半導體:晶圓製造"]["net_nt"] == 100

    pc = result[1]
    assert pc["out_nt"] == 40
    assert pc["net_nt"] == -40
    assert pc["in_count"] == 0
    assert pc["out_count"] == 1


def test_aggregate_by_sector_parent_no_double_count_across_subthemes():
    """
    Spec example: one stock, two sub-themes.
    GIVEN inflow 2330(total_nt=100, ["半導體:晶圓製造","半導體:IC設計"])
    THEN parent 半導體 in_count=1 with two children.
    """
    inflow = [{"stock_code": "2330", "total_nt": 100}]
    outflow = []
    industry_map = {"2330": ["半導體:晶圓製造", "半導體:IC設計"]}

    result = FlowComputeStep._aggregate_by_sector(inflow, outflow, industry_map)

    assert len(result) == 1
    semi = result[0]
    assert semi["sector"] == "半導體"
    assert semi["in_count"] == 1
    assert semi["in_nt"] == 100  # not double-counted to 200
    child_names = {c["sector"] for c in semi["children"]}
    assert child_names == {"半導體:晶圓製造", "半導體:IC設計"}


def test_aggregate_by_sector_empty_map_returns_empty_list():
    """Scenario: Industry mapping unavailable -> by_sector is []."""
    inflow = [{"stock_code": "2330", "total_nt": 100}]
    outflow = [{"stock_code": "2317", "total_nt": -40}]
    assert FlowComputeStep._aggregate_by_sector(inflow, outflow, {}) == []
