import pytest
import pandas as pd
from ETF.parsers.xlsx_parser import (
    _identify_header_row,
    _standardize_columns,
    KEY_STOCK_NAME,
    KEY_STOCK_CODE,
    COL_CODE,
    COL_NAME,
    COL_SHARES,
    COL_WEIGHT
)

def test_identify_header_row_basic():
    # Setup DataFrame with header at index 2
    # DataFrame constructor often assumes first row is header if not specified, but here data is passed as list of lists
    data = [
        ["Info", "Info", "Info"],
        ["Date", "2026/01/01", ""],
        ["股票代號", "股票名稱", "股數"],
        ["2330", "TSMC", "1000"],
    ]
    df = pd.DataFrame(data)
    
    idx = _identify_header_row(df)
    assert idx == 2

def test_identify_header_row_not_found():
    data = [
        ["Info", "Info"],
        ["Only code", "股票代號"],
    ]
    df = pd.DataFrame(data)
    idx = _identify_header_row(df)
    assert idx == -1

def test_standardize_columns():
    # Using specific strings that appear in real excel
    cols = pd.Index([" 股票代號 ", " 股票名稱", "持股數", "權重(%)", "Other"])
    # Note: Logic is "股數" in col name
    
    mapping = _standardize_columns(cols)
    
    # Check if mappings are correct
    # The dictionary keys are the original column names
    assert mapping[" 股票代號 "] == COL_CODE
    assert mapping[" 股票名稱"] == COL_NAME
    assert mapping["權重(%)"] == COL_WEIGHT
    assert mapping["持股數"] == COL_SHARES
    assert "Other" not in mapping
