"""
Finlab 連線整合測試

此測試會實際呼叫 Finlab API，需要有效的 API Key。
僅在 CI 或手動測試時執行。
"""

import pytest
import os


# 標記為需要外部服務的整合測試
pytestmark = pytest.mark.integration


@pytest.fixture
def finlab_api_key():
    """取得 Finlab API Key"""
    key = os.getenv("FINLAB_API_KEY")
    if not key:
        pytest.skip("FINLAB_API_KEY not set")
    return key


class TestFinlabConnection:
    """Finlab API 連線測試"""

    def test_finlab_login(self, finlab_api_key):
        """測試 Finlab 登入"""
        import finlab
        
        try:
            finlab.login(finlab_api_key)
            assert True
        except Exception as e:
            pytest.fail(f"Finlab login failed: {e}")

    def test_finlab_fetch_price_data(self, finlab_api_key):
        """測試取得價格資料"""
        import finlab
        from finlab import data
        
        finlab.login(finlab_api_key)
        
        close = data.get('price:收盤價')
        
        assert close is not None
        assert len(close) > 0
        assert close.shape[1] > 100  # 應該有超過 100 支股票

    def test_finlab_client_singleton(self, finlab_api_key):
        """測試 FinlabClient 單例模式"""
        from ETF.services.finlab.client import FinlabClient
        
        client1 = FinlabClient.get_instance(finlab_api_key)
        client2 = FinlabClient.get_instance(finlab_api_key)
        
        assert client1 is client2
