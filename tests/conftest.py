"""
Pytest Shared Fixtures

共用的測試 fixtures，自動被所有測試檔案使用。
"""

import pytest
import os
from pathlib import Path
from dotenv import load_dotenv


@pytest.fixture(scope="session", autouse=True)
def load_test_env():
    """
    載入測試環境變數。
    優先使用 .env.test，其次 .env.local。
    """
    project_root = Path(__file__).parent.parent
    
    env_test = project_root / ".env.test"
    env_local = project_root / ".env.local"
    
    if env_test.exists():
        load_dotenv(env_test)
    elif env_local.exists():
        load_dotenv(env_local)


@pytest.fixture
def sample_holding_data():
    """
    提供測試用的持股資料樣本。
    """
    return [
        {
            "stock_code": "2330",
            "stock_name": "台積電",
            "shares": 1000000,
            "weight": 15.5,
            "price": 850.0,
            "change_percent": 1.2,
        },
        {
            "stock_code": "2317",
            "stock_name": "鴻海",
            "shares": 500000,
            "weight": 8.2,
            "price": 120.0,
            "change_percent": -0.5,
        },
    ]


@pytest.fixture
def mock_finlab_client(mocker):
    """
    Mock FinlabClient 以避免實際 API 呼叫。
    需要安裝 pytest-mock。
    """
    mock_client = mocker.patch("ETF.services.finlab.client.FinlabClient")
    mock_client.return_value.login.return_value = True
    return mock_client
