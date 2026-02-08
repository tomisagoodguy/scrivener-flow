import pytest
from ETF.utils.date_parser import normalize_date

@pytest.mark.parametrize("input_str, expected", [
    ("2026/01/22", "20260122"),
    ("2026-01-22", "20260122"),
    ("115/01/22", "20260122"),
    ("115-01-22", "20260122"),
    ("  2026/01/22  ", "20260122"),
    ("invalid", None),
    ("", None),
    (None, None),
])
def test_normalize_date(input_str, expected):
    assert normalize_date(input_str) == expected
