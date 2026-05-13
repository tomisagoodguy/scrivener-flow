"""Tests for validate_registry_sync.py"""

import pytest
from ETF.scripts.validate_registry_sync import compare_registries, parse_ts_codes, parse_py_codes


def test_registries_in_sync():
    ts = {"00981A", "00980A"}
    py = {"00981A", "00980A"}
    diff = compare_registries(ts, py)
    assert diff == {"only_in_ts": set(), "only_in_py": set()}


def test_ts_has_extra_code():
    ts = {"00981A", "00980A", "00999A"}
    py = {"00981A", "00980A"}
    diff = compare_registries(ts, py)
    assert diff["only_in_ts"] == {"00999A"}
    assert diff["only_in_py"] == set()


def test_py_has_extra_code():
    ts = {"00981A"}
    py = {"00981A", "00888A"}
    diff = compare_registries(ts, py)
    assert diff["only_in_ts"] == set()
    assert diff["only_in_py"] == {"00888A"}


def test_parse_ts_codes_from_sample():
    sample = """
    { code: '00981A', shortCode: '00981', name: '主動統一台股增長' },
    { code: '00980A', shortCode: '00980', name: '主動野村臺灣優選' },
    """
    codes = parse_ts_codes(sample)
    assert codes == {"00981A", "00980A"}


def test_parse_ts_codes_no_codes():
    sample = "export const ETF_REGISTRY = [];"
    codes = parse_ts_codes(sample)
    assert codes == set()


def test_parse_py_codes_from_sample():
    sample = '''
    EtfEntry(code="00981A", name="主動統一台股增長"),
    EtfEntry(code="00980A", name="主動野村臺灣優選"),
    '''
    codes = parse_py_codes(sample)
    assert codes == {"00981A", "00980A"}
