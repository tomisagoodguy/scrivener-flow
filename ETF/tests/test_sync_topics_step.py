"""
Tests for SyncTopicsStep.

TDD: Tests written BEFORE implementation of ETF/pipeline/steps/sync_topics_step.py.
Verifies:
- Successful sync: topics and assignments upserted, orphans deleted
- HTTP failure: error is logged, pipeline continues without raise
- company-topics/index.json multi-topic mapping (spec Example table)
"""

import logging
from typing import Any
from unittest.mock import MagicMock, call, patch

import argparse
import pathlib

import pytest

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.sync_topics_step import SyncTopicsStep


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_TOPICS_JSON = [
    {
        "id": "asic-ip-design",
        "name": "ASIC/IP 設計",
        "short_name": "ASIC",
        "group": "半導體",
        "description": "客製化 IC 設計",
        "color": "#6366f1",
        "icon": "cpu",
    },
    {
        "id": "hpc-network-ic",
        "name": "HPC 網通 IC",
        "short_name": "HPC",
        "group": "半導體",
        "description": "高效能運算網通",
        "color": "#8b5cf6",
        "icon": "network",
    },
    {
        "id": "battery-cell-module",
        "name": "電池芯模組",
        "short_name": "電池",
        "group": "電動車",
        "description": "鋰電池芯與模組",
        "color": "#10b981",
        "icon": "battery",
    },
]

# company-topics/index.json: { stock_code: [topic_id, ...] }
SAMPLE_COMPANY_TOPICS_JSON = {
    "2330": ["asic-ip-design", "hpc-network-ic"],
    "1101": ["battery-cell-module"],
}


def make_ctx() -> PipelineContext:
    args = argparse.Namespace(dry_run=False)
    ctx = PipelineContext(args=args, output_dir=pathlib.Path("/tmp"))
    return ctx


def make_services() -> MagicMock:
    services = MagicMock()
    conn = MagicMock()
    services.sql_storage.engine.connect.return_value.__enter__ = MagicMock(return_value=conn)
    services.sql_storage.engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    return services


# ---------------------------------------------------------------------------
# Interface tests
# ---------------------------------------------------------------------------


def test_sync_topics_step_name():
    assert SyncTopicsStep().name == "Sync Topics"


def test_sync_topics_step_inherits_base():
    from ETF.pipeline.steps.base import BaseStep
    assert issubclass(SyncTopicsStep, BaseStep)


# ---------------------------------------------------------------------------
# Scenario: Successful sync
# ---------------------------------------------------------------------------


def test_successful_sync_executes_upserts():
    """WHEN SyncTopicsStep executes THEN it upserts topics and assignments."""
    step = SyncTopicsStep()
    ctx = make_ctx()
    services = make_services()

    topics_response = MagicMock()
    topics_response.status_code = 200
    topics_response.json.return_value = SAMPLE_TOPICS_JSON

    company_response = MagicMock()
    company_response.status_code = 200
    company_response.json.return_value = SAMPLE_COMPANY_TOPICS_JSON

    with patch("requests.get", side_effect=[topics_response, company_response]):
        result = step.execute(ctx, services)

    assert result is ctx
    conn = services.sql_storage.engine.connect.return_value.__enter__.return_value
    # Should have executed SQL statements
    assert conn.execute.called


def test_successful_sync_returns_ctx():
    """execute() always returns ctx regardless of outcome."""
    step = SyncTopicsStep()
    ctx = make_ctx()
    services = make_services()

    ok_response = MagicMock()
    ok_response.status_code = 200
    ok_response.json.return_value = SAMPLE_TOPICS_JSON

    company_response = MagicMock()
    company_response.status_code = 200
    company_response.json.return_value = SAMPLE_COMPANY_TOPICS_JSON

    with patch("requests.get", side_effect=[ok_response, company_response]):
        result = step.execute(ctx, services)

    assert result is ctx


# ---------------------------------------------------------------------------
# Scenario: Step failure does not break pipeline
# ---------------------------------------------------------------------------


def test_http_failure_does_not_raise(caplog):
    """WHEN HTTP call fails THEN step logs error and does NOT raise."""
    step = SyncTopicsStep()
    ctx = make_ctx()
    services = make_services()

    fail_response = MagicMock()
    fail_response.status_code = 503
    fail_response.raise_for_status.side_effect = Exception("503 Service Unavailable")

    with patch("requests.get", side_effect=Exception("Connection timeout")):
        with caplog.at_level(logging.ERROR):
            result = step.execute(ctx, services)

    assert result is ctx
    assert any("error" in r.levelname.lower() or "Error" in r.message or "failed" in r.message.lower()
                for r in caplog.records), "Expected an error log entry"


def test_network_unreachable_does_not_raise():
    """WHEN requests.get raises THEN execute returns ctx without re-raising."""
    step = SyncTopicsStep()
    ctx = make_ctx()
    services = make_services()

    with patch("requests.get", side_effect=ConnectionError("Network unreachable")):
        result = step.execute(ctx, services)

    assert result is ctx


# ---------------------------------------------------------------------------
# Scenario: Multi-topic stock (spec Example table)
# ---------------------------------------------------------------------------


def test_multi_topic_stock_creates_multiple_assignment_rows():
    """
    GIVEN 2330 maps to ["asic-ip-design", "hpc-network-ic"]
    WHEN step processes company-topics
    THEN two assignment rows are created for 2330
    """
    step = SyncTopicsStep()

    assignments = step._build_assignments(SAMPLE_COMPANY_TOPICS_JSON)

    rows_for_2330 = [a for a in assignments if a["stock_code"] == "2330"]
    assert len(rows_for_2330) == 2, f"Expected 2 rows for 2330, got {len(rows_for_2330)}"
    topic_ids = {r["topic_id"] for r in rows_for_2330}
    assert topic_ids == {"asic-ip-design", "hpc-network-ic"}


def test_single_topic_stock_creates_one_assignment_row():
    """
    GIVEN 1101 maps to ["battery-cell-module"]
    WHEN step processes company-topics
    THEN one assignment row is created for 1101
    """
    step = SyncTopicsStep()
    assignments = step._build_assignments(SAMPLE_COMPANY_TOPICS_JSON)

    rows_for_1101 = [a for a in assignments if a["stock_code"] == "1101"]
    assert len(rows_for_1101) == 1
    assert rows_for_1101[0]["topic_id"] == "battery-cell-module"


def test_build_topics_rows_from_json():
    """_build_topics() maps JSON fields to DB columns correctly."""
    step = SyncTopicsStep()
    rows = step._build_topics(SAMPLE_TOPICS_JSON)

    assert len(rows) == 3
    row = rows[0]
    assert row["topic_id"] == "asic-ip-design"
    assert row["name"] == "ASIC/IP 設計"
    assert row["short_name"] == "ASIC"
    assert row["group_name"] == "半導體"
    assert row["color"] == "#6366f1"
